import { useState, useEffect } from 'react'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Spinner from 'react-bootstrap/Spinner'
import { ethers } from 'ethers'

const Mint = ({ provider, nft, cost, setIsLoading }) => {
  const [isWaiting, setIsWaiting] = useState(false)
  const [maxMintAmount, setMaxMintAmount] = useState(1)
  const [mintAmount, setMintAmount] = useState(1)

  useEffect(() => {
    const getMaxMintAmount = async () => {
      try {
        const maxAmount = await nft.maxMintAmountPerTx()
        console.log('maxAmount', maxAmount)
        setMaxMintAmount(maxAmount.toNumber())
      } catch (error) {
        console.error('Error fetching max mint amount:', error)
      }
    }

    if (nft) {
      getMaxMintAmount()
    }
  }, [nft])

  const mintHandler = async (e) => {
    e.preventDefault()
    setIsWaiting(true)

    try {
      const signer = await provider.getSigner()
      const totalCost = cost.mul(mintAmount)
      const transaction = await nft
        .connect(signer)
        .mint(mintAmount, { value: totalCost })
      await transaction.wait()
    } catch (error) {
      window.alert('User rejected or transaction reverted')
    }

    setIsLoading(true)
  }

  const totalCost = cost ? cost.mul(mintAmount) : 0
  const totalCostEth = totalCost
    ? parseFloat(ethers.utils.formatEther(totalCost)).toFixed(4)
    : '0'

  return (
    <Form
      onSubmit={mintHandler}
      style={{ maxWidth: '450px', margin: '50px auto' }}
    >
      <Form.Group className='mb-3'>
        <Form.Label>Number of NFTs to mint:</Form.Label>
        <Form.Select
          value={mintAmount}
          onChange={(e) => setMintAmount(parseInt(e.target.value))}
        >
          {Array.from({ length: maxMintAmount }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className='mb-3'>
        <Form.Label>Total Cost: {totalCostEth} ETH</Form.Label>
      </Form.Group>

      {isWaiting ? (
        <Spinner
          animation='border'
          style={{ display: 'block', margin: '0 auto' }}
        />
      ) : (
        <Form.Group>
          <Button variant='primary' type='submit' style={{ width: '100%' }}>
            Mint {mintAmount} NFT{mintAmount > 1 ? 's' : ''}
          </Button>
        </Form.Group>
      )}
    </Form>
  )
}

export default Mint
