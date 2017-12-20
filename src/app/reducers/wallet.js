const initialState = {
  opened: 0
}

export default (state = initialState, { type, payload }) => {
  switch (type) {
  case 'RESET_ALL':
    return initialState
  case 'SET_WALLET':
    return {
      ...state,
      type: payload.type,
      address: payload.address,
      data: payload.data
    }
  case 'WALLET_OPENED':
    const { address } = payload.wallet
    return {
      ...state,
      address: typeof state.address !== 'undefined'
        ? (Array.isArray(state.address) ? [...state.address, address] : [state.address, address])
        : address,
      opened: state.opened + 1
    }
  default:
    return state
  }
}
