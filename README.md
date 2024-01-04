# Universal Offchain Unwrapper Worker

A Cloudflare worker for processing batch CCIP-read requests from the UniversalResolver.
There is a live version is available at [universal-offchain-unwrapper-v2.ens-cf.workers.dev](https://universal-offchain-unwrapper-v2.ens-cf.workers.dev), which is the default batch endpoint used by the main UniversalResolver deployments.

## Prerequisites

Before deploying this worker, make sure you have the following:

- A Cloudflare account
- Cloudflare Workers enabled for your domain
- Node.js and pnpm installed on your local machine

## Getting Started

To get started with this worker, follow these steps:

1. Clone this repository to your local machine:

```bash
git clone https://github.com/ensdomains/universal-offchain-unwrapper.git
```

2. Install the required dependencies:

```bash
cd universal-offchain-unwrapper
pnpm install
```

3. Build and deploy the worker:

```bash
pnpm run deploy
```

4. Using the endpoint:

Once the deployment is successful, you can use the endpoint with the UniversalResolver by specifying the url in `gateways` of any of the following functions:

- `function resolve(bytes name, bytes data, string[] gateways) view returns (bytes, address)`
- `function resolve(bytes name, bytes[] data, string[] gateways) view returns (tuple(bool,bytes)[], address)`
- `function reverse(bytes reverseName, string[] gateways) view returns (string, address, address, address)`

Alternatively, you can also use the gateway with [viem](https://viem.sh)'s ENS-related functions, or within [ENSjs](https://github.com/ensdomains/ensjs-v3).

## Customization

You can set specific supported sender addresses (specific contracts that can use this endpoint) in `wrangler.toml` by setting the `SUPPORTED_SENDERS` var.

## Contributing

Contributions are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).
