"""Smoke-test the GX10 Python environment (plan slice E1).

Prints one fact per line and exits non-zero when CUDA or the ONNX round trip fails.
Run with the environment's interpreter: .venv/bin/python scripts/gx10/probe_env.py
"""
import io
import platform
import sys
import time

import numpy as np
import onnx
import onnxruntime as ort
import torch

SEED = 7
ATOL = 1e-5


def timed_matmul(device: str, size: int = 2048, repeats: int = 5) -> float:
    """Median seconds for one float32 matmul, after a warm-up, with the device synchronized."""
    gen = torch.Generator(device="cpu").manual_seed(SEED)
    a = torch.randn(size, size, generator=gen).to(device)
    b = torch.randn(size, size, generator=gen).to(device)
    samples = []
    for i in range(repeats + 1):
        start = time.perf_counter()
        (a @ b).sum().item()
        if device == "cuda":
            torch.cuda.synchronize()
        if i:  # the first pass is warm-up
            samples.append(time.perf_counter() - start)
    return sorted(samples)[len(samples) // 2]


def onnx_round_trip() -> float:
    """Export a tiny MLP and return the max abs difference between PyTorch and ONNX Runtime."""
    torch.manual_seed(SEED)
    model = torch.nn.Sequential(torch.nn.Linear(2, 8), torch.nn.Tanh(), torch.nn.Linear(8, 1)).eval()
    x = torch.randn(4, 2)
    buffer = io.BytesIO()
    torch.onnx.export(model, (x,), buffer, input_names=["x"], output_names=["y"], dynamo=False)
    onnx.checker.check_model(onnx.load_from_string(buffer.getvalue()))
    session = ort.InferenceSession(buffer.getvalue(), providers=["CPUExecutionProvider"])
    got = session.run(["y"], {"x": x.numpy()})[0]
    return float(np.abs(got - model(x).detach().numpy()).max())


def main() -> int:
    print(f"python: {platform.python_version()} on {platform.machine()}")
    print(f"torch: {torch.__version__}")
    print(f"torch_cuda_build: {torch.version.cuda}")
    print(f"numpy: {np.__version__}")
    print(f"onnx: {onnx.__version__}")
    print(f"onnxruntime: {ort.__version__}")
    print(f"onnxruntime_providers: {','.join(ort.get_available_providers())}")

    ok = True
    cuda = torch.cuda.is_available()
    print(f"cuda_available: {cuda}")
    if cuda:
        print(f"cuda_device: {torch.cuda.get_device_name(0)}")
        cpu_s, gpu_s = timed_matmul("cpu"), timed_matmul("cuda")
        print(f"matmul_2048_float32_cpu_median_s: {cpu_s:.5f}")
        print(f"matmul_2048_float32_cuda_median_s: {gpu_s:.5f}")
    else:
        ok = False

    diff = onnx_round_trip()
    print(f"onnx_round_trip_max_abs_diff: {diff:.2e}")
    ok = ok and diff <= ATOL
    print(f"result: {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
