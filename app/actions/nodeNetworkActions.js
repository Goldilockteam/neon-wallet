// @flow
import { rpc } from 'neon-js'
import { createActions } from 'spunky'
import {
  NODES_MAIN_NET,
  NODES_TEST_NET,
  NODES_GOLDI_NET,
  MAIN_NETWORK_ID,
  TEST_NETWORK_ID,
  NODE_EXLUSION_CRITERIA
} from '../core/constants'

const ID = 'nodeNetwork'

const getBlockCount = async node =>
  new Promise(resolve => {
    let url = node.protocol ? `${node.protocol}://${node.url}` : node.url
    url = node.port ? `${url}:${node.port}` : url

    const client = new rpc.RPCClient(url)
    client
      .ping()
      .then(latency => {
        if (client.lastSeenHeight !== 0) {
          resolve({
            url,
            blockCount: client.lastSeenHeight,
            latency
          })
        }
      })
      .catch({})
  })

const raceNodePromises = (total, promises) => {
  const responses = []
  return new Promise(resolve =>
    promises.forEach(promise =>
      promise.then(result => {
        responses.push(result)
        if (responses.length === total) resolve(responses)
      })
    )
  )
}

export default createActions(
  ID,
  ({ totalDisplayed = 15, networkId }) => async () => {
    let nodes
    switch (networkId) {
      case MAIN_NETWORK_ID:
        nodes = NODES_MAIN_NET.filter(
          data =>
            !NODE_EXLUSION_CRITERIA.some(criteria =>
              data.url.includes(criteria)
            )
        )
        break
      case TEST_NETWORK_ID:
        nodes = NODES_TEST_NET
        // eslint-disable-next-line
        totalDisplayed = NODES_TEST_NET.length
        break
      case GOLDI_NETWORK_ID:
        nodes = NODES_GOLDI_NET
        // eslint-disable-next-line
        totalDisplayed = NODES_GOLDI_NET.length
        break
      default:
        nodes = NODES_MAIN_NET.filter(
          data =>
            !NODE_EXLUSION_CRITERIA.some(criteria =>
              data.url.includes(criteria)
            )
        )
    }
    const promises = [...nodes].map(node => getBlockCount(node))
    const result = await raceNodePromises(totalDisplayed, promises)
    return result
  }
)
