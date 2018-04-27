import { createSelector } from 'reselect'
import { mapValues } from 'Utilities/helpers'
import { getSwapStatus, getSwapFriendlyError, estimateReceiveAmount, statusAllSwaps } from 'Utilities/swap'
import { createItemSelector, selectItemId } from 'Utilities/selector'
import { toBigNumber } from 'Utilities/convert'

import { getAllAssets } from './asset'
import { getAllWallets } from './wallet'

export const getSwapState = ({ swap }) => swap

const createSwapExtender = (allAssets, allWallets) => (swap) => {
  const { sendWalletId, sendSymbol, receiveSymbol, fee } = swap
  const tx = swap.tx || {}
  const { receipt, feeSymbol: txFeeSymbol, feeAmount: txFeeAmount } = tx
  const sendAsset = allAssets[sendSymbol]
  const receiveAsset = allAssets[receiveSymbol]
  const txFeeAsset = allAssets[txFeeSymbol]
  const txFeeFiat = txFeeAsset && txFeeAmount ? txFeeAsset.price.times(txFeeAmount) : undefined
  return {
    ...swap,
    sendAsset,
    receiveAsset,
    receiveUnits: estimateReceiveAmount(swap, receiveAsset),
    status: getSwapStatus(swap),
    friendlyError: getSwapFriendlyError(swap),
    hasFee: fee && toBigNumber(fee).gt(0),
    tx: {
      ...tx,
      signingSupported: (allWallets[sendWalletId] || {}).isSignTxSupported,
      confirmed: Boolean(receipt),
      succeeded: receipt && (receipt.status === true || receipt.status === '0x1'),
      feeAsset: txFeeAsset,
      feeFiat: txFeeFiat,
    }
  }
}

export const getAllSwaps = createSelector(
  getSwapState,
  getAllAssets,
  getAllWallets,
  (allSwaps, allAssets, allWallets) => mapValues(allSwaps, createSwapExtender(allAssets, allWallets)))
export const getAllSwapsArray = createSelector(getAllSwaps, Object.values)
export const getSwap = createItemSelector(getAllSwaps, selectItemId, (allSwaps, id) => allSwaps[id])

export const getCurrentSwundle = getAllSwapsArray
export const getCurrentSwundleStatus = createSelector(getCurrentSwundle, statusAllSwaps)

export const doesCurrentSwundleRequireSigning = createSelector(getCurrentSwundle,
  (swaps) => swaps.some(({ tx }) => tx && tx.signingSupported && !tx.signed))

export const isCurrentSwundleReadyToSign = createSelector(getCurrentSwundle,
  (swaps) => swaps.every(({ status }) => ['sign_tx_error', 'signing_unsupported', 'unsigned'].includes(status.detailsCode)))

export const isCurrentSwundleReadyToSend = createSelector(getCurrentSwundle,
  (swaps) => swaps.every(({ status }) => ['send_tx_error', 'signing_unsupported', 'signed'].includes(status.detailsCode)))

/** Returns an Array of all walletIds used by swaps in the current swundle */
export const getCurrentSwundleWalletIds = createSelector(getCurrentSwundle, (swaps) => 
  Array.from(swaps.reduce(
    (walletIds, { sendWalletId, receiveWalletId }) => 
      walletIds.add(sendWalletId).add(receiveWalletId),
    new Set())))

/** Returns the walletId used by all swaps in the current swundle, or null, if the swaps involve
  * more than one wallet.
  */
export const getCurrentSwundleWalletId = createSelector(
  getCurrentSwundleWalletIds,
  (walletIds) => walletIds.length === 1 ? walletIds[0] : null)