import * as OracleSdk from "@keydonix/uniswap-oracle-sdk";
import { ethers } from "ethers";
// const JSON_RPC = `${process.env.NETWORK_FORK}`;
const JSON_RPC = `http://127.0.0.1:8545/`;
const provider = new ethers.providers.JsonRpcProvider(JSON_RPC);

export type BlockHash = {
  readonly hash: bigint;
};

export const getStorageAt = async (
  address: bigint,
  position: bigint,
  blockNumber: bigint | "latest"
): Promise<bigint> => {
  //   const check = await provider.getCode(ethers.utils.hexValue(address));
  //   console.log("check: ", check);

  const block = await provider.send("eth_getBlockByNumber", [
    blockNumber !== "latest" ? ethers.utils.hexValue(blockNumber) : blockNumber,
    false,
  ]);
  return (
    provider
      // .getStorageAt(ethers.utils.hexValue(address), position, 12596295)
      .getStorageAt(ethers.utils.hexValue(address), position, block.number)
      .then((value) => BigInt(value))
  );
};

export const getProof = async (
  address: bigint,
  positions: readonly bigint[],
  block: bigint
): Promise<OracleSdk.ProofResult> => {
  const proof = await provider.send("eth_getProof", [
    ethers.utils.hexValue(address),
    positions.map((value) => ethers.utils.hexValue(value)),
    ethers.utils.hexValue(block),
  ]);
  return {
    accountProof: proof.accountProof.map((result: string) =>
      ethers.utils.arrayify(result)
    ),
    storageProof: proof.storageProof.map(
      (result: { key: any; value: any; proof: [any] }) => {
        return {
          key: BigInt(result.key),
          value: BigInt(result.value),
          proof: result.proof.map((result) => ethers.utils.arrayify(result)),
        };
      }
    ),
  };
};

export const getBlockByNumber = async (
  blockNumber: bigint | "latest"
): Promise<OracleSdk.Block | null> => {
  const block = await provider.send("eth_getBlockByNumber", [
    blockNumber !== "latest" ? ethers.utils.hexValue(blockNumber) : blockNumber,
    false,
  ]);
  return {
    parentHash: BigInt(block.parentHash),
    sha3Uncles: BigInt(block.sha3Uncles),
    miner: BigInt(block.miner),
    stateRoot: BigInt(block.stateRoot),
    transactionsRoot: BigInt(block.transactionsRoot),
    receiptsRoot: BigInt(block.receiptsRoot),
    logsBloom: BigInt(block.logsBloom),
    difficulty: BigInt(block.difficulty),
    number: BigInt(block.number),
    gasLimit: BigInt(block.gasLimit),
    gasUsed: BigInt(block.gasUsed),
    timestamp: BigInt(block.timestamp),
    extraData: ethers.utils.arrayify(block.extraData),
    mixHash: BigInt(block.mixHash),
    nonce: BigInt(block.nonce),
  };
};

export const getBlockHashByNumber = async (
  blockNumber: bigint | "latest"
): Promise<BlockHash | null> => {
  const block = await provider.send("eth_getBlockByNumber", [
    blockNumber !== "latest" ? ethers.utils.hexValue(blockNumber) : blockNumber,
    false,
  ]);
  return {
    hash: BigInt(block.hash),
  };
};
