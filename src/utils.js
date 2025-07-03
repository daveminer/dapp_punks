const { MerkleTree } = require('merkletreejs')
const { keccak256, defaultAbiCoder } = require('ethers/lib/utils')

// Helper function to convert hex string to Uint8Array
const hexToBytes = (hex) => {
  const cleanHex = hex.replace(/^0x/, '')
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
  }
  return bytes
}

// Helper function to convert Uint8Array to hex string
const bytesToHex = (bytes) => {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Custom Merkle Tree wrapper to match OpenZeppelin StandardMerkleTree
class CustomMerkleTree {
  constructor(values, leafEncoding) {
    this.values = values
    this.leafEncoding = leafEncoding
    this.tree = null
    this.leaves = []
    this.initialized = false
  }

  // Initialize the tree
  async initialize() {
    if (this.initialized) return this
    // Leaves as Buffers, double-hashed as in OZ contract
    this.leaves = this.values.map((value) => this.hashLeaf(value))
    this.tree = new MerkleTree(this.leaves, keccak256, {
      hashLeaves: false,
      sortPairs: true,
    })
    this.initialized = true
    return this
  }

  // Hash a leaf value according to the encoding, return Buffer
  hashLeaf(value) {
    if (this.leafEncoding.includes('address')) {
      const address = value[0]
      // OZ: keccak256(bytes.concat(keccak256(abi.encode(address))))
      const inner = keccak256(defaultAbiCoder.encode(['address'], [address]))
      const leaf = keccak256(inner)
      return hexToBytes(leaf)
    }
    const valueStr = JSON.stringify(value)
    return hexToBytes(keccak256(valueStr))
  }

  // Get the root of the tree
  get root() {
    if (!this.initialized || !this.tree) return null
    return '0x' + bytesToHex(this.tree.getRoot())
  }

  // Get the proof for a specific index
  getProof(index) {
    if (!this.initialized) {
      throw new Error('Tree not initialized. Call initialize() first.')
    }
    if (index < 0 || index >= this.values.length) {
      throw new Error('Index out of bounds')
    }
    const leaf = this.leaves[index]
    const proof = this.tree.getProof(leaf)
    return proof.map((p) => '0x' + bytesToHex(p.data))
  }

  // Verify a proof
  verify(proof, root, leaf) {
    if (!this.initialized || !this.tree) return false
    const proofBuffers = proof.map((p) => hexToBytes(p))
    const leafBuffer = hexToBytes(leaf)
    const rootBuffer = hexToBytes(root)
    return this.tree.verify(proofBuffers, leafBuffer, rootBuffer)
  }
}

// Factory function to create a Merkle tree (matches OpenZeppelin interface)
const buildMerkleTree = async (allowedAddresses) => {
  const wrappedAddresses = wrapAddresses(allowedAddresses)
  const tree = new CustomMerkleTree(wrappedAddresses, ['address'])
  return await tree.initialize()
}

// Gets the proof for an address in the list of allowed addresses
const getMerkleProof = (tree, address, allowedAddresses) => {
  const index = wrapAddresses(allowedAddresses).findIndex(
    (addr) => addr[0] === address
  )
  return tree.getProof(index)
}

const wrapAddresses = (allowedAddresses) =>
  allowedAddresses.map((addr) => [addr])

module.exports = {
  buildMerkleTree,
  getMerkleProof,
}
