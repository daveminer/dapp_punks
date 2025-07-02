import { useEffect, useState } from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import Countdown from 'react-countdown'
import { ethers } from 'ethers'

// Components
import Navigation from './Navigation'
import Data from './Data'
import Mint from './Mint'
import Loading from './Loading'

// ABIs: Import your contract ABIs here
import NFT_ABI from '../abis/NFT.json'

// Config: Import your network config here
import config from '../config.json'
import logo from '../preview.webp'

function App() {
  const [provider, setProvider] = useState(null)
  const [nft, setNFT] = useState(null)

  const [account, setAccount] = useState(null)

  const [revealTime, setRevealTime] = useState(0)
  const [maxSupply, setMaxSupply] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)
  const [cost, setCost] = useState(0)
  const [balance, setBalance] = useState(0)
  const [allowedAddresses, setAllowedAddresses] = useState([])

  const [isLoading, setIsLoading] = useState(true)

  const loadBlockchainData = async () => {
    console.log('loadBlockchainData')
    // Initiate provider
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)

    console.log('provider', provider)
    // Initiate contract
    const nft = new ethers.Contract(
      config[31337].nft.address,
      NFT_ABI,
      provider
    )
    setNFT(nft)

    // Fetch accounts
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    })
    const account = ethers.utils.getAddress(accounts[0])
    setAccount(account)

    // Fetch Countdown
    const allowMintingOn = await nft.allowMintingOn()
    setRevealTime(allowMintingOn.toString() + '000')

    // Fetch maxSupply
    setMaxSupply(await nft.maxSupply())

    // Fetch totalSupply
    setTotalSupply(await nft.totalSupply())

    // Fetch cost
    setCost(await nft.cost())

    // Fetch account balance
    setBalance(await nft.balanceOf(account))

    // Set allowed addresses (first two Hardhat accounts)
    const allowedAddrs = [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Hardhat account 0
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Hardhat account 1
    ]
    setAllowedAddresses(allowedAddrs)

    console.log('isLoading', isLoading)

    setIsLoading(false)
  }

  useEffect(() => {
    if (isLoading) {
      loadBlockchainData()
    }
  }, [isLoading])

  return (
    <Container>
      <Navigation account={account} />

      <h1 className='my-4 text-center'>Dapp Punks</h1>

      {isLoading ? (
        <Loading />
      ) : (
        <>
          <Row>
            <Col>
              {balance > 0 ? (
                <div className='text-center'>
                  <h2>You own this Dapp Punk</h2>
                  <img
                    src={`https://gateway.pinata.cloud/ipfs/QmQPEMsfd1tJnqYPbnTQCjoa8vczfsV1FmqZWgRdNQ7z3g/${balance.toString()}.png`}
                    alt='Open Punk'
                    width='400px'
                    height='400px'
                  />
                </div>
              ) : (
                <img src={logo} alt='' width='100%' />
              )}
            </Col>
            <Col>
              <div className='my-4 text-center'>
                <Countdown date={parseInt(revealTime)} className='h2' />
              </div>
              <Data
                maxSupply={maxSupply}
                totalSupply={totalSupply}
                cost={cost}
                balance={balance}
              />
              <Mint
                provider={provider}
                nft={nft}
                cost={cost}
                setIsLoading={setIsLoading}
                allowedAddresses={allowedAddresses}
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  )
}

export default App
