import os
from safetensors.torch import load_file, save_file

def federated_average(client_dirs, output_dir):
    state_dicts = []

    for d in client_dirs:
        path = os.path.join(d, "adapter_model.safetensors")
        state_dicts.append(load_file(path))

    avg_dict = {}

    for key in state_dicts[0]:
        avg_dict[key] = sum(sd[key] for sd in state_dicts) / len(state_dicts)

    os.makedirs(output_dir, exist_ok=True)

    save_file(
        avg_dict,
        os.path.join(output_dir, "adapter_model.safetensors")
    )

    # Copy config from first client
    config_src = os.path.join(client_dirs[0], "adapter_config.json")
    config_dst = os.path.join(output_dir, "adapter_config.json")

    with open(config_src, "rb") as f:
        config_data = f.read()

    with open(config_dst, "wb") as f:
        f.write(config_data)

    print("Global model aggregated.")