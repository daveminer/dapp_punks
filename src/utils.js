const { StandardMerkleTree } = require('@openzeppelin/merkle-tree')

const buildMerkleTree = (allowedAddresses) => {
  return StandardMerkleTree.of(wrapAddresses(allowedAddresses), ['address'])
}

// Gets the proof for an address in the list of allowed addresses
const getMerkleProof = (tree, address, allowedAddresses) => {
  const index = wrapAddresses(allowedAddresses).findIndex(
    (addr) => addr[0] === address
  )
  return tree.getProof(index)
}

const wrapAddresses = (allowedAddresses) => {
  return allowedAddresses.map((addr) => [addr])
}

module.exports = {
  buildMerkleTree,
  getMerkleProof,
}
