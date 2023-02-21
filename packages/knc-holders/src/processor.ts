import { Store, TypeormDatabase } from '@subsquid/typeorm-store';
import {BatchHandlerContext, BatchProcessorItem, EvmBatchProcessor} from '@subsquid/evm-processor'
import { lookupArchive } from '@subsquid/archive-registry'
import { KncHolder } from './model';
import { events } from './abi/Erc20';
import { BigNumber } from 'ethers';
import { In } from 'typeorm';

const processor = new EvmBatchProcessor()
  .setDataSource({
    // uncomment and set RPC_ENDPOONT to enable contract state queries. 
    // Both https and wss endpoints are supported. 
    // chain: process.env.RPC_ENDPOINT,

    // Change the Archive endpoints for run the squid 
    // against the other EVM networks
    // For a full list of supported networks and config options
    // see https://docs.subsquid.io/develop-a-squid/evm-processor/configuration/

    archive: lookupArchive('polygon'),
  })
  .setBlockRange({
    from: 15428391,
  })
  .addLog('0x1c954e8fe737f99f68fa1ccda3e51ebdb291948c', {
    filter: [[
      events.Transfer.topic
    ]],
    data: {
      evmLog: {
        topics: true,
        data: true,
      }
    },
  })

type Item = BatchProcessorItem<typeof processor>
type Ctx = BatchHandlerContext<Store, Item>

interface TransferData {
  from: string,
  to: string,
  amount: bigint
}

processor.run(new TypeormDatabase(), async (ctx) => {
  let transferData: TransferData[] = [];
  let accountIds = new Set<string>();
  let accounts = new Map<string, KncHolder>();
  for (let block of ctx.blocks) {
    for (let e of block.items) {
      if (e.kind !== "evmLog") {
        continue
      }
      if (e.evmLog.topics[0] == events.Transfer.topic) {
        let event = events.Transfer.decode(e.evmLog);
        accountIds.add(event.from)
        accountIds.add(event.to)
        transferData.push({
          from: event.from,
          to: event.to,
          amount: event.value.toBigInt(),
        })
      }
    }
  }
  // available data in storage
  let accs =  await ctx.store
            .findBy(KncHolder, {id: In([...accountIds])})
  
  for (let a of accs) {
    accounts.set(a.id, a)
  }

  for (let d of transferData) {
    let holder = findHolder(d.from, accounts)
    accounts.set(d.from, updateHolder(holder, d.from, d.amount*-1n))
    holder = findHolder(d.to, accounts)
    accounts.set(d.to,  updateHolder(holder,  d.to, d.amount))
  }

  await ctx.store.save(Array.from(accounts.values()))
});

function updateHolder(holder: KncHolder|undefined, id: string, amount: bigint): KncHolder {
  if (!holder) {
    holder= new KncHolder({
      id: id,
      amount: amount,
    })
  } else {
    holder.amount += amount
  }
  return holder
}

function findHolder(id: string, holders: Map<string, KncHolder>): KncHolder {
  let h = holders.get(id)
  if (!h) {
    h = new KncHolder({
      id: id,
      amount: BigInt("0")
    })
  }
  return h
}
