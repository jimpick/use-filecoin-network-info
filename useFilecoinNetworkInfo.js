import React, { useState, useEffect } from 'react'
import fetch from 'node-fetch'
import useFilecoinConfig from '@filecoin-shipyard/use-filecoin-config'

export default function useFilecoinNetworkInfo ({
  interval = 1000
}) {
  const [error, setError] = useState()
  const [, configNetName] = useFilecoinConfig('net')
  const [netName, setNetName] = useState()
  const [headBlocks, setHeadBlocks] = useState()
  const [height, setHeight] = useState()
  const [updateTime, setUpdateTime] = useState()

  useEffect(() => {
    const netName = configNetName ? configNetName : 'devnet-user'
    setNetName(netName)
    const state = {
      timeoutId: null,
      height
    }
    async function doWork () {
      try {
        let api
        if (netName === 'devnet-user') {
          api = 'http://user.kittyhawk.wtf:8000/api'
        } else if (netName === 'devnet-nightly') {
          api = 'https://explorer.nightly.kittyhawk.wtf/api'
        } else if (netName === 'devnet-staging') {
          api = 'https://explorer.staging.kittyhawk.wtf/api'
        }
        if (!api) return

        const response = await fetch(`${api}/chain/head`)
        const headCids = await response.json()
        const headBlocks = {}
        let newHeight
        for (const cid of headCids) {
          const cidString = cid['/']
          const response = await fetch(`${api}/show/block/${cidString}`)
          const block = await response.json()
          headBlocks[cid.toString()] = block
          newHeight = Number(block.Header.height)
        }
        setHeadBlocks(headBlocks)
        if (newHeight !== state.height) {
          state.height = newHeight
          setHeight(state.height)
          setUpdateTime(Date.now())
        }
        setError(null)
      } catch (err) {
        setError(err)
      }
    }
    function schedule () {
      state.timeoutId = setTimeout(async () => {
        await doWork()
        schedule()
      }, interval)
    }
    doWork().then(schedule)
    return () => clearTimeout(state.timeoutId)
  }, [configNetName])

  return [error, netName, headBlocks, height, updateTime]
}
