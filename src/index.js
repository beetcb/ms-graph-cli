#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { EOL } from 'os'
import { resolve } from 'path'

import fetch from 'node-fetch'
import open from 'open'
import prompts from 'prompts'

import json from '../hints.json'
import serve from './serve'
import { delTmpKeys, someUndefinedOrEmptyString } from './utils'

/**
 * Don't wanna introduce typescript because json produces a dynamic type
 * @typedef {typeof json} StepsWithHint
 * @typedef {StepsWithHint[keyof StepsWithHint]} Hints
 * @typedef {'en' | 'cn'} Lang
 */

/**
 * @type {StepsWithHint}
 */
const steps = json

const headers = {
  'content-type': 'application/x-www-form-urlencoded',
}

/**
 * Prompt and acquire code, returns credentials
 * @param {Lang} lang
 */
async function init(lang) {
  const res = await getPromptWithHints(steps.step_init, lang)
  const { client_id, client_secret, deploy_type, account_type, redirect_uri } =
    res

  if (
    !someUndefinedOrEmptyString(
      client_id,
      client_secret,
      deploy_type,
      account_type,
      redirect_uri,
    )
  ) {
    const auth_endpoint = `${
      [
        'https://login.microsoftonline.com',
        'https://login.partner.microsoftonline.cn',
      ][account_type]
    }/common/oauth2/v2.0`

    await open(
      `${auth_endpoint}/authorize?${
        new URLSearchParams({
          client_id,
          scope: deploy_type
            ? 'Sites.Read.All Sites.ReadWrite.All offline_access' // SharePoint
            : 'Files.Read.All Files.ReadWrite.All offline_access', // OneDrive
          response_type: 'code',
        }).toString()
      }&redirect_uri=${redirect_uri}`,
    )

    const code = await serve(redirect_uri).catch(() =>
      console.error('\u274c Acquire authorization_code failed!')
    )

    const credentials = {
      account_type,
      deploy_type,
      code,
      client_id,
      client_secret,
      redirect_uri,
      auth_endpoint,
    }
    return credentials
  }
}

// Acquire token with credentials
async function acquireToken(credentials) {
  const { code, client_id, client_secret, auth_endpoint, redirect_uri } =
    credentials

  if (
    !someUndefinedOrEmptyString(
      code,
      client_id,
      client_secret,
      auth_endpoint,
      redirect_uri,
    )
  ) {
    const res = await fetch(`${auth_endpoint}/token`, {
      method: 'POST',
      body: `${
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id,
          client_secret,
        }).toString()
      }&redirect_uri=${redirect_uri}`,
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      const { refresh_token, access_token } = data
      return { refresh_token, access_token }
    } else {
      console.error('\u274c Acquire token failed! ' + res.statusText)
    }
  }
}

async function addDriveAPI(credentials, token, lang) {
  const { account_type, deploy_type } = credentials
  const { access_token } = token
  if (!someUndefinedOrEmptyString(account_type, deploy_type, access_token)) {
    const graphAPI = [
      'https://graph.microsoft.com/v1.0',
      'https://microsoftgraph.chinacloudapi.cn/v1.0',
    ][account_type]

    if (deploy_type === 1) {
      // SharePoint
      let res = await getPromptWithHints(
        steps.step_sharepoint_need_site_id,
        lang,
      )

      if (res.need_site_id === 0) {
        res = await getPromptWithHints(steps.step_sharepoint_site_id, lang)

        console.log('Grab site-id from ms-graph')
        res = await fetch(
          `${graphAPI}/sites/${res.host_name}:${res.site_path}?$select=id`,
          {
            headers: {
              Authorization: `bearer ${access_token}`,
            },
          },
        )

        if (res.ok) {
          data = await res.json()
          credentials.drive_api = `${graphAPI}/sites/${data.id}/drive`
          credentials.site_id = data.id
        }
      }
    } else {
      // Onedrive
      credentials.drive_api = `${graphAPI}/me/drive`
    }
    credentials.graph_api = graphAPI
    return credentials
  }
}

/**
 * @param {Hints} hints
 * @param {Lang} lang
 */
async function getPromptWithHints(hints, lang) {
  const promptsWithHint = hints.map((h) => {
    const [name, messages] = h
    const {
      prompt_type: type,
      prompt_text: {
        [lang]: [message, ...choices],
      },
      initial,
    } = messages
    const p = {
      type,
      name,
      message,
      choices,
      initial,
    }

    return p
  })

  return prompts(promptsWithHint)
}

;(async () => {
  // Command line arguments parser
  const argumets = process.argv.slice(2)
  // Default: won't save, lang is EN
  let [isSave, lang, isLangSpecified] = [0, 'en', 0]

  argumets.forEach((e) => {
    switch (e) {
      case '-s':
      case '--save': {
        isSave = 1
        break
      }
      case '-l':
      case '--lang': {
        isLangSpecified = 1
        break
      }
      case 'en':
      case 'cn': {
        if (e === 'cn' && isLangSpecified) lang = 'cn'
      }
    }
  })

  let token,
    result,
    credentials = await init(lang)
  if (credentials) {
    token = await acquireToken(credentials)
    if (token) {
      credentials = await addDriveAPI(credentials, token, lang)
      if (credentials) {
        delTmpKeys(credentials, ['code', 'account_type', 'deploy_type'])
        result = { ...credentials, ...token }
      }
    }
  }

  if (result && isSave) {
    writeFileSync(
      resolve('./.env'),
      Object.keys(result).reduce((env, e) => {
        return `${env}${e} = ${result[e]}${EOL}`
      }, ''),
    )
    console.warn(
      lang
        ? '生成的验证信息已保存到  ./.env , enjoy! 🎉'
        : 'Saved generated credentials to ./.env , enjoy! 🎉',
    )
  } else if (result) {
    console.log(result)
  }
  process.exit(1)
})()
