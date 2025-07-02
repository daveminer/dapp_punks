const { expect } = require('chai')
const { ethers } = require('hardhat')
const { buildMerkleTree, getMerkleProof } = require('../src/utils')

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('NFT', () => {
  const NAME = 'Dapp Punks'
  const SYMBOL = 'DP'
  const COST = ether(10)
  const MAX_SUPPLY = 25
  const BASE_URI = 'ipfs://QmQ2jnDYecFhrf3asEWjyjZRX1pZSsNWG3qHzmNDvXa9qg/'
  const MAX_MINT_AMOUNT_PER_TX = 5

  let nft,
    deployer,
    minter,
    allowedAddresses,
    allowedAddressesRootWithMinter,
    minterProof

  beforeEach(async () => {
    const accounts = await ethers.getSigners()
    deployer = accounts[0]
    minter = accounts[1]
    allowedAddresses = [deployer.address, minter.address]

    // Prepare values for the Merkle tree (array of arrays)
    const tree = buildMerkleTree(allowedAddresses)

    allowedAddressesRootWithMinter = tree.root
    // Find the index of the minter in the values array
    minterProof = getMerkleProof(tree, minter.address, allowedAddresses)
  })

  describe('Deployment', () => {
    ALLOW_MINTING_ON = (Date.now() + 120000).toString().slice(0, 10)

    beforeEach(async () => {
      const NFT = await ethers.getContractFactory('NFT')
      nft = await NFT.deploy(
        NAME,
        SYMBOL,
        COST,
        MAX_SUPPLY,
        ALLOW_MINTING_ON,
        MAX_MINT_AMOUNT_PER_TX,
        BASE_URI,
        allowedAddressesRootWithMinter
      )
    })

    it('has correct name', async () => {
      expect(await nft.name()).to.equal(NAME)
    })

    it('has correct symbol', async () => {
      expect(await nft.symbol()).to.equal(SYMBOL)
    })

    it('returns the cost to mint', async () => {
      expect(await nft.cost()).to.equal(COST)
    })

    it('returns the maximum total supply', async () => {
      expect(await nft.maxSupply()).to.equal(MAX_SUPPLY)
    })

    it('returns the allow minting time', async () => {
      expect(await nft.allowMintingOn()).to.equal(ALLOW_MINTING_ON)
    })

    it('returns the base URI', async () => {
      expect(await nft.baseURI()).to.equal(BASE_URI)
    })

    it('returns the owner', async () => {
      expect(await nft.owner()).to.equal(deployer.address)
    })

    it('returns the allowed addresses root', async () => {
      expect(await nft.allowedAddressesRoot()).to.equal(
        allowedAddressesRootWithMinter
      )
    })
  })

  describe('Minting', () => {
    let transaction

    describe('Success', () => {
      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        transaction = await nft
          .connect(minter)
          .mint(1, minterProof, { value: COST })
        await transaction.wait()
      })

      it('returns the address of the minter', async () => {
        expect(await nft.ownerOf(1)).to.equal(minter.address)
      })

      it('returns total number of tokens the minter owns', async () => {
        expect(await nft.balanceOf(minter.address)).to.equal(1)
      })

      it('returns IPFS URI', async () => {
        expect(await nft.tokenURI(1)).to.equal(`${BASE_URI}1.json`)
      })

      it('updates the total supply', async () => {
        expect(await nft.totalSupply()).to.equal(1)
      })

      it('updates the contract ether balance', async () => {
        expect(await ethers.provider.getBalance(nft.address)).to.equal(COST)
      })

      it('emits Mint event', async () => {
        await expect(transaction)
          .to.emit(nft, 'Mint')
          .withArgs(1, minter.address)
      })

      it('allows minting multiple NFTs in a single transaction', async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        const mintAmount = 3
        const totalCost = COST.mul(mintAmount)
        // Use the same proof for all tokens since minter is in the tree
        transaction = await nft
          .connect(minter)
          .mint(mintAmount, minterProof, { value: totalCost })
        result = await transaction.wait()

        expect(await nft.ownerOf(1)).to.equal(minter.address)
        expect(await nft.ownerOf(2)).to.equal(minter.address)
        expect(await nft.ownerOf(3)).to.equal(minter.address)
        expect(await nft.totalSupply()).to.equal(mintAmount)
        expect(await nft.balanceOf(minter.address)).to.equal(mintAmount)
        expect(await ethers.provider.getBalance(nft.address)).to.equal(
          totalCost
        )
        await expect(transaction)
          .to.emit(nft, 'Mint')
          .withArgs(mintAmount, minter.address)
      })
    })

    describe('Failure', () => {
      it('rejects insufficient payment', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        await expect(
          nft.connect(minter).mint(1, minterProof, { value: ether(1) })
        ).to.be.reverted
      })

      it('requires at least 1 NFT to be minted', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        await expect(nft.connect(minter).mint(0, minterProof, { value: COST }))
          .to.be.reverted
      })

      it('rejects minting before allowed time', async () => {
        const ALLOW_MINTING_ON = new Date('May 26, 2030 18:00:00')
          .getTime()
          .toString()
          .slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        await expect(nft.connect(minter).mint(1, minterProof, { value: COST }))
          .to.be.reverted
      })

      it('does not allow more NFTs to be minted than max amount', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        await expect(
          nft.connect(minter).mint(100, minterProof, { value: COST })
        ).to.be.reverted
      })

      it('does not return URIs for invalid tokens', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )
        nft.connect(minter).mint(1, minterProof, { value: COST })

        await expect(nft.tokenURI('99')).to.be.reverted
      })

      it('does not allow a transaction to mint more than max amount per transaction', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        await expect(nft.connect(minter).mint(15, minterProof, { value: COST }))
          .to.be.reverted
      })
    })

    describe('Displaying NFTs', () => {
      let transaction, result

      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(
          NAME,
          SYMBOL,
          COST,
          MAX_SUPPLY,
          ALLOW_MINTING_ON,
          MAX_MINT_AMOUNT_PER_TX,
          BASE_URI,
          allowedAddressesRootWithMinter
        )

        // Mint 3 nfts
        transaction = await nft.connect(minter).mint(3, minterProof, {
          value: ether(30),
        })
        result = await transaction.wait()
      })

      it('returns all the NFTs for a given owner', async () => {
        let tokenIds = await nft.walletOfOwner(minter.address)

        expect(tokenIds.length).to.equal(3)
        expect(tokenIds[0].toString()).to.equal('1')
        expect(tokenIds[1].toString()).to.equal('2')
        expect(tokenIds[2].toString()).to.equal('3')
      })
    })

    describe('Withdrawing', () => {
      describe('Success', async () => {
        let transaction, result, balanceBefore

        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

        beforeEach(async () => {
          const NFT = await ethers.getContractFactory('NFT')
          nft = await NFT.deploy(
            NAME,
            SYMBOL,
            COST,
            MAX_SUPPLY,
            ALLOW_MINTING_ON,
            MAX_MINT_AMOUNT_PER_TX,
            BASE_URI,
            allowedAddressesRootWithMinter
          )

          transaction = await nft.connect(minter).mint(1, minterProof, {
            value: COST,
          })
          result = await transaction.wait()

          balanceBefore = await ethers.provider.getBalance(deployer.address)

          transaction = await nft.connect(deployer).withdraw()
          result = await transaction.wait()
        })

        it('deducts contract balance', async () => {
          expect(await ethers.provider.getBalance(nft.address)).to.equal(0)
        })

        it('sends funds to the owner', async () => {
          expect(
            await ethers.provider.getBalance(deployer.address)
          ).to.be.greaterThan(balanceBefore)
        })

        it('emits a withdraw event', async () => {
          expect(transaction)
            .to.emit(nft, 'Withdraw')
            .withArgs(COST, deployer.address)
        })
      })

      describe('Failure', async () => {
        it('prevents non-owner from withdrawing', async () => {
          const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
          const NFT = await ethers.getContractFactory('NFT')
          nft = await NFT.deploy(
            NAME,
            SYMBOL,
            COST,
            MAX_SUPPLY,
            ALLOW_MINTING_ON,
            MAX_MINT_AMOUNT_PER_TX,
            BASE_URI,
            allowedAddressesRootWithMinter
          )
          nft.connect(minter).mint(1, minterProof, { value: COST })

          await expect(nft.connect(minter).withdraw()).to.be.reverted
        })
      })

      describe('Pausing', () => {
        let transaction, result

        describe('Success', () => {
          const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)

          beforeEach(async () => {
            const NFT = await ethers.getContractFactory('NFT')
            nft = await NFT.deploy(
              NAME,
              SYMBOL,
              COST,
              MAX_SUPPLY,
              ALLOW_MINTING_ON,
              MAX_MINT_AMOUNT_PER_TX,
              BASE_URI,
              allowedAddressesRootWithMinter
            )
          })

          it('allows owner to pause the contract', async () => {
            transaction = await nft.connect(deployer).pause()
            result = await transaction.wait()

            expect(await nft.paused()).to.equal(true)
            await expect(transaction)
              .to.emit(nft, 'Paused')
              .withArgs(deployer.address)
          })

          it('allows owner to unpause the contract', async () => {
            // First pause
            await nft.connect(deployer).pause()

            // Then unpause
            transaction = await nft.connect(deployer).unpause()
            result = await transaction.wait()

            expect(await nft.paused()).to.equal(false)
            await expect(transaction)
              .to.emit(nft, 'Unpaused')
              .withArgs(deployer.address)
          })

          it('prevents minting when contract is paused', async () => {
            // Pause the contract
            await nft.connect(deployer).pause()

            // Try to mint - should fail
            await expect(
              nft.connect(minter).mint(1, minterProof, { value: COST })
            ).to.be.reverted
          })

          it('allows minting after contract is unpaused', async () => {
            // Pause the contract
            await nft.connect(deployer).pause()

            // Unpause the contract
            await nft.connect(deployer).unpause()

            // Now minting should work
            transaction = await nft.connect(minter).mint(1, minterProof, {
              value: COST,
            })
            result = await transaction.wait()

            expect(await nft.ownerOf(1)).to.equal(minter.address)
            expect(await nft.totalSupply()).to.equal(1)
          })
        })

        describe('Failure', () => {
          const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10)

          beforeEach(async () => {
            const NFT = await ethers.getContractFactory('NFT')
            nft = await NFT.deploy(
              NAME,
              SYMBOL,
              COST,
              MAX_SUPPLY,
              ALLOW_MINTING_ON,
              MAX_MINT_AMOUNT_PER_TX,
              BASE_URI,
              allowedAddressesRootWithMinter
            )
          })

          it('prevents non-owner from pausing', async () => {
            await expect(nft.connect(minter).pause()).to.be.reverted
          })

          it('prevents non-owner from unpausing', async () => {
            // First pause as owner
            await nft.connect(deployer).pause()

            // Try to unpause as non-owner
            await expect(nft.connect(minter).unpause()).to.be.reverted
          })
        })
      })
    })
  })
})
