#!/usr/bin/env node
import { prompt } from 'inquirer'
import { EOL } from 'os'
import { writeFileSync } from 'fs'
import fetch from 'node-fetch'
import { resolve } from 'path'

const headers = {
  'content-type': 'application/x-www-form-urlencoded',
}

// Prompt and acquire code, returns credentials
async function init() {
  let questions = [
    {
      type: 'list',
      name: 'account_type',
      message: 'Please select your OneDrive or SharePoint account type:',
      choices: [
        {
          value: 1,
          name: 'Global',
        },
        {
          value: 0,
          name: 'Operated by 21Vianet in China',
        },
      ],
    },
    {
      type: 'list',
      name: 'deploy_type',
      message: 'Please select your deploy type (OneDrive or SharePoint):',
      choices: [
        {
          value: 1,
          name: 'OneDrive',
        },
        {
          value: 0,
          name: 'SharePoint',
        },
      ],
    },
    {
      type: 'input',
      name: 'client_id',
      message: 'Enter your client_id:',
    },
    {
      type: 'input',
      name: 'client_secret',
      message: 'Enter your client_secret:',
    },
    {
      type: 'input',
      name: 'redirect_uri',
      message: 'Enter your redirect_uri (http://localhost would be ok here):',
    },
  ]

  let res = await prompt(questions)

  const { client_id, client_secret, deploy_type, account_type, redirect_uri } = res

  const auth_endpoint = `${
    account_type ? 'https://login.microsoftonline.com' : 'https://login.partner.microsoftonline.cn'
  }/common/oauth2/v2.0`

  questions = [
    {
      type: 'input',
      name: 'code',
      message: `Use your browser to access this URL:\n${auth_endpoint}/authorize?${new URLSearchParams({
        client_id,
        scope: deploy_type
          ? 'Files.Read.All Files.ReadWrite.All offline_access'
          : 'Sites.Read.All Sites.ReadWrite.All offline_access',
        response_type: 'code',
      }).toString()}&redirect_uri=${redirect_uri}\nThen enter the address you were redirected to(it's in your address bar):`,
    },
  ]

  res = await prompt(questions)
  const code = new URL(res.code).searchParams.get('code')
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

// Acquire token with credentials
async function acquireToken(credentials) {
  try {
    const { code, client_id, client_secret, auth_endpoint, redirect_uri } = credentials

    const res = await fetch(`${auth_endpoint}/token`, {
      method: 'POST',
      body: `${new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id,
        client_secret,
      }).toString()}&redirect_uri=${redirect_uri}`,
      headers,
    })
    if (res.ok) {
      const data = await res.json()
      credentials.refresh_token = data.refresh_token
      credentials.access_token = data.access_token
    } else {
      console.error('Get token failed!' + res.statusText)
    }
  } catch (e) {
    console.warn(e)
  }
  return credentials
}

async function getDriveApi(credentials) {
  const { account_type, deploy_type, access_token } = credentials
  const graphApi = account_type ? 'https://graph.microsoft.com/v1.0' : 'https://microsoftgraph.chinacloudapi.cn/v1.0'
  if (!deploy_type) {
    // SharePoint
    questions = [
      {
        type: 'list',
        name: 'isNeedSiteId',
        message: 'Do you want to get SharePoint SiteId ?',
        choices: [
          {
            value: 1,
            name: 'YES',
          },
          {
            value: 0,
            name: 'NO',
          },
        ],
      },
    ]
    let res = await prompt(questions)
    if (res.isNeedSiteId) {
      questions = [
        {
          type: 'input',
          name: 'hostName',
          message:
            'To get the SharePoint SiteID, You must specify:\n1. SharePoint site host (e.g., cent.sharepoint.com)',
        },
        {
          type: 'input',
          name: 'sitePath',
          message: 'SharePoint sites path (e.g., /sites/centUser)',
        },
      ]
      res = await prompt(questions)

      console.log('Grab site-id from ms-graph')
      res = await fetch(`${graphApi}/sites/${res.hostName}:${res.sitePath}?$select=id`, {
        headers: {
          Authorization: `bearer ${access_token}`,
        },
      })

      if (res.ok) {
        data = await res.json()
        credentials.drive_api = `${graphApi}/sites/${data.id}/drive`
        credentials.site_id = data.id
      }
    }
  } else {
    // Onedrive
    credentials.drive_api = `${graphApi}/me/drive`
  }
  credentials.graph_api = graphApi
}

function delKey(credentials) {
  delete credentials.code
  delete credentials.account_type
  delete credentials.deploy_type
}

;(async () => {
  const credentials = await acquireToken(await init())
  await getDriveApi(credentials)
  delKey(credentials)

  const save = process.argv[2]
  if (save) {
    writeFileSync(
      resolve('./.env'),
      Object.keys(credentials).reduce((env, e) => {
        return `${env}${e} = ${credentials[e]}${EOL}`
      }, '')
    )
    console.warn('Saved generated credentials to ./.env , enjoy! 🎉')
  } else {
    console.log(credentials)
  }
})()
