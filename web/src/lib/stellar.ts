import * as StellarSdk from "@stellar/stellar-sdk";

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || "testnet";
const HORIZON_URL =
  NETWORK === "testnet"
    ? "https://horizon-testnet.stellar.org"
    : "https://horizon.stellar.org";
const SOROBAN_RPC_URL =
  NETWORK === "testnet"
    ? "https://soroban-testnet.stellar.org"
    : "https://soroban-mainnet.stellar.org";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export const NETWORK_PASSPHRASE =
  NETWORK === "testnet"
    ? StellarSdk.Networks.TESTNET
    : StellarSdk.Networks.PUBLIC;

let server: StellarSdk.Horizon.Server | null = null;
let rpc: any = null;

function getServer() {
  if (!server) server = new StellarSdk.Horizon.Server(HORIZON_URL);
  return server;
}

function getRpc() {
  if (!rpc) rpc = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);
  return rpc;
}

export async function loadAccount(publicKey: string) {
  return getServer().loadAccount(publicKey);
}

export async function submitTransaction(signedXdr: string) {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  return getServer().submitTransaction(tx);
}

export async function getAccountBalance(
  publicKey: string,
  assetCode = "USDC"
): Promise<string> {
  try {
    const account = await getServer().loadAccount(publicKey);
    const balance = account.balances.find(
      (b: any) => b.asset_code === assetCode
    );
    return balance ? balance.balance : "0";
  } catch {
    return "0";
  }
}

export async function simulateContract(
  contractAddress: string,
  method: string,
  args: any[],
  source: string
) {
  const contract = new StellarSdk.Contract(contractAddress);
  const account = await getServer().loadAccount(source);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  return getRpc().simulateTransaction(transaction);
}

export {
  StellarSdk,
  getServer,
  getRpc,
  NETWORK,
  HORIZON_URL,
  SOROBAN_RPC_URL,
};
