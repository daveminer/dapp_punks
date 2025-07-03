import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

const PurchaseHistory = ({ nft, account }) => {
  const [purchasedNFTs, setPurchasedNFTs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPurchasedNFTs = async () => {
      if (!nft || !account) {
        setLoading(false)
        return
      }

      try {
        // Get all NFTs owned by the user
        const tokenIds = await nft.walletOfOwner(account)

        // If user has less than 2 NFTs, show nothing
        if (tokenIds.length < 2) {
          setPurchasedNFTs([])
          setLoading(false)
          return
        }

        // Remove the last NFT (most recent purchase)
        const previousNFTs = tokenIds.slice(0, -1)
        setPurchasedNFTs(previousNFTs)
      } catch (error) {
        console.error('Error fetching purchased NFTs:', error)
        setPurchasedNFTs([])
      } finally {
        setLoading(false)
      }
    }

    fetchPurchasedNFTs()
  }, [nft, account])

  if (loading) {
    return <div className='text-center mt-4'>Loading purchase history...</div>
  }

  if (purchasedNFTs.length === 0) {
    return null // Don't show anything if user has less than 2 NFTs
  }

  return (
    <div className='mt-4'>
      <h3>Purchase History</h3>
      <div className='row'>
        {purchasedNFTs.map((tokenId) => (
          <div key={tokenId.toString()} className='col-md-4 mb-3'>
            <div className='card'>
              <img
                src={`https://gateway.pinata.cloud/ipfs/QmQPEMsfd1tJnqYPbnTQCjoa8vczfsV1FmqZWgRdNQ7z3g/${tokenId.toString()}.png`}
                alt={`Dapp Punk #${tokenId.toString()}`}
                className='card-img-top'
                style={{ width: '100%', height: '200px', objectFit: 'cover' }}
              />
              <div className='card-body'>
                <h5 className='card-title'>Dapp Punk #{tokenId.toString()}</h5>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PurchaseHistory
