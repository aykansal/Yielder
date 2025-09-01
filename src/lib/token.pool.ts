import { createSigner } from "@permaweb/aoconnect"
import { Tag } from "./arkit"

export async function transfer(
    data: TransferParams,
    signer: ReturnType<typeof createSigner>,
    ao: any,
) {
    // execute the transfer
    return await ao.message({
        process: data.token,
        signer,
        tags: [
            { name: "Action", value: "Transfer" },
            { name: "Recipient", value: data.recipient },
            { name: "Quantity", value: data.quantity.toString() },
            ...(data.tags || []),
        ],
    })
}

interface TransferParams {
    token: string
    quantity: bigint
    recipient: string
    tags?: Tag[]
}