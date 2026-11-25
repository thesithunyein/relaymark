import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAddress, type Address, type EIP1193Provider } from 'viem'
import { addressInput } from './chain'

type WalletChoice = {
  name: string
  id: string
  provider: EIP1193Provider
  icon?: string
  unavailable?: string
}
type ProviderAnnouncement = {
  provider: EIP1193Provider
  info: { uuid: string; name: string; icon?: string; rdns?: string }
}
type Active = { account: Address; provider?: EIP1193Provider; name: string }
type WalletContext = {
  active?: Active
  choices: WalletChoice[]
  connect: (choice: WalletChoice) => Promise<void>
  useCli: (address: string) => void
  disconnect: () => void
  open: boolean
  setOpen: (value: boolean) => void
}

const context = createContext<WalletContext | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Active>()
  const [choices, setChoices] = useState<WalletChoice[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const add = (event: Event) => {
      const detail = (event as CustomEvent<ProviderAnnouncement>).detail
      if (typeof detail?.provider?.request !== 'function' || typeof detail.info?.uuid !== 'string'
          || !detail.info.uuid || typeof detail.info.name !== 'string' || !detail.info.name.trim()) return
      const { provider, info } = detail
      const name = info.name.trim()
      const icon = typeof info.icon === 'string' && /^data:image\/[a-z0-9.+-]+(?:;[^,]*)?,/i.test(info.icon)
        ? info.icon : undefined
      // QoreX announces an EVM provider for account and chain reads only.
      const unavailable = info.rdns === 'network.qore.qorex' || (!info.rdns && name.toLowerCase() === 'qorex')
        ? 'BNB Smart Chain signing unavailable.' : undefined
      setChoices(current => {
        const announced = current.filter(item => item.id !== 'injected')
        if (announced.some(item => item.provider === provider || item.id === info.uuid)) return current
        return [...announced, { provider, name, id: info.uuid, icon, unavailable }]
      })
    }
    window.addEventListener('eip6963:announceProvider', add)
    window.dispatchEvent(new Event('eip6963:requestProvider'))
    const timer = window.setTimeout(() => {
      const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum
      if (provider) setChoices(current => current.length ? current : [{ provider, name: 'Browser wallet', id: 'injected' }])
    }, 250)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('eip6963:announceProvider', add)
    }
  }, [])

  useEffect(() => {
    const provider = active?.provider
    if (!provider?.on || !provider.removeListener) return
    const onChange = (accounts: Address[]) => {
      setActive(current => current && accounts[0] ? { ...current, account: getAddress(accounts[0]) } : undefined)
    }
    const onDisconnect = () => setActive(undefined)
    provider.on('accountsChanged', onChange)
    provider.on('disconnect', onDisconnect)
    return () => {
      provider.removeListener('accountsChanged', onChange)
      provider.removeListener('disconnect', onDisconnect)
    }
  }, [active?.provider])

  const connect = async (choice: WalletChoice) => {
    if (choice.unavailable) throw new Error(choice.unavailable)
    const accounts = await choice.provider.request({ method: 'eth_requestAccounts' })
    if (!accounts[0]) throw new Error('Choose an account in your wallet.')
    setActive({ account: getAddress(accounts[0]), name: choice.name, provider: choice.provider })
    setOpen(false)
  }

  const useCli = (input: string) => {
    const account = addressInput(input)
    if (!account) throw new Error('Enter a valid BNB Smart Chain wallet address.')
    setActive({ account, name: 'Wallet CLI' })
    setOpen(false)
  }

  return <context.Provider value={{ active, choices, connect, useCli, disconnect: () => {
    setActive(undefined)
    setOpen(false)
  }, open, setOpen }}>{children}</context.Provider>
}

export function useWallet() {
  const value = useContext(context)
  if (!value) throw new Error('The wallet service is missing.')
  return value
}
