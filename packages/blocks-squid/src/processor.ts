import { TypeormDatabase } from '@subsquid/typeorm-store';
import {EvmBatchProcessor} from '@subsquid/evm-processor'
import { lookupArchive } from '@subsquid/archive-registry'
import assert from 'assert';
import { Block } from './model';

const processor = new EvmBatchProcessor()
  .setDataSource({
    // uncomment and set RPC_ENDPOONT to enable contract state queries. 
    // Both https and wss endpoints are supported. 
    // chain: process.env.RPC_ENDPOINT,

    // Change the Archive endpoints for run the squid 
    // against the other EVM networks
    // For a full list of supported networks and config options
    // see https://docs.subsquid.io/develop-a-squid/evm-processor/configuration/

    archive: lookupArchive('eth-mainnet'),
  })
  .setBlockRange({ from: 12165522})

processor.run(new TypeormDatabase(), async (ctx) => {
  const blocks: Block[] = []
  for (let c of ctx.blocks) {
      // decode and normalize the tx data
      blocks.push(new Block({
        id: c.header.id,
        number: BigInt(c.header.height),
        timestamp: BigInt(c.header.timestamp),
        parentHash: c.header.parentHash,
        author: c.header.miner,
        gasLimit: c.header.gasLimit,
        gasUsed: c.header.gasUsed,
        receiptsRoot: c.header.receiptsRoot,
        transactionsRoot: c.header.transactionsRoot,
        stateRoot: c.header.stateRoot,
        size: c.header.size,
        unclesHash: c.header.sha3Uncles,
      }))
   }
   await ctx.store.save(blocks)
});

