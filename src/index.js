#!/usr/bin/env node
import { EOL } from "os";
import { prompt } from "inquirer";
import { resolve } from "path";
import { writeFileSync } from "fs";

import fetch from "node-fetch";

const headers = {
  "content-type": "application/x-www-form-urlencoded",
};

// Prompt and acquire code, returns credentials
async function init(lang) {
  // Print i18n hints
  // - 0 EN_US
  // - 1 ZH_CN
  const i18nHints = {
    account_type: [
      [
        "Please select your OneDrive or SharePoint account type:",
        "Global",
        "Operated by 21Vianet in China",
      ],
      ["请选择你的 OneDrive 或 SharePoint 账户类型:", "国际版", "世纪互联版"],
    ],
    deploy_type: [
      [
        "Please select your deploy type (OneDrive or SharePoint):",
        "OneDrive",
        "SharePoint",
      ],
      ["请选择你的部署类型:", "OneDrive", "SharePoint"],
    ],
    client_id: ["Enter your client_id:", "请提供你的 client_id:"],
    client_secret: ["Enter your client_secret:", "请提供你的 client_secret:"],
    redirect_uri: [
      "Enter your redirect_uri ([Default] http://localhost):",
      "请提供你的 redirect_uri ([默认] http://localhost):",
    ],
    goBrowser: [
      "Use your browser to visit this URL for login and authorization:",
      "请在浏览器中打开此地址进行登录和授权:",
    ],
    backTerminal: [
      `Then enter the address you were redirected to(it's in your address bar):\n`,
      " 然后请输入浏览器地址栏重定向的地址:\n",
    ],
  };

  
  let questions = [
    {
      type: "list",
      name: "account_type",
      message: i18nHints.account_type[lang][0],
      choices: [
        {
          value: 1,
          name: i18nHints.account_type[lang][1],
        },
        {
          value: 0,
          name: i18nHints.account_type[lang][2],
        },
      ],
    },
    {
      type: "list",
      name: "deploy_type",
      message: i18nHints.deploy_type[lang][0],
      choices: [
        {
          value: 1,
          name: i18nHints.deploy_type[lang][1],
        },
        {
          value: 0,
          name: i18nHints.deploy_type[lang][2],
        },
      ],
    },
    {
      type: "input",
      name: "client_id",
      message: i18nHints.client_id[lang],
    },
    {
      type: "input",
      name: "client_secret",
      message: i18nHints.client_secret[lang],
    },
    {
      type: "input",
      name: "redirect_uri",
      message: i18nHints.redirect_uri[lang],
    },
  ];

  let res = await prompt(questions);

  const { client_id, client_secret, deploy_type, account_type } = res;

  // We need to manually set it cause iquirer set it as ''
  // so we can't use destructuring assignment default values
  let { redirect_uri } = res;
  if (redirect_uri === "") {
    redirect_uri = "http://localhost";
  }

  const auth_endpoint = `${
    account_type
      ? "https://login.microsoftonline.com"
      : "https://login.partner.microsoftonline.cn"
  }/common/oauth2/v2.0`;

  questions = [
    {
      type: "input",
      name: "code",
      message: `${i18nHints.goBrowser[lang]}\n${auth_endpoint}/authorize?${
        new URLSearchParams({
          client_id,
          scope: deploy_type
            ? "Files.Read.All Files.ReadWrite.All offline_access"
            : "Sites.Read.All Sites.ReadWrite.All offline_access",
          response_type: "code",
        }).toString()
      }&redirect_uri=${redirect_uri}\n${i18nHints.backTerminal[lang]}`,
    },
  ];

  res = await prompt(questions);
  const code = new URL(res.code).searchParams.get("code");
  const credentials = {
    account_type,
    deploy_type,
    code,
    client_id,
    client_secret,
    redirect_uri,
    auth_endpoint,
  };
  return credentials;
}

// Acquire token with credentials
async function acquireToken(credentials) {
  try {
    const { code, client_id, client_secret, auth_endpoint, redirect_uri } =
      credentials;

    const res = await fetch(`${auth_endpoint}/token`, {
      method: "POST",
      body: `${
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id,
          client_secret,
        }).toString()
      }&redirect_uri=${redirect_uri}`,
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      credentials.refresh_token = data.refresh_token;
      credentials.access_token = data.access_token;
    } else {
      console.error("Get token failed!" + res.statusText);
    }
  } catch (e) {
    console.warn(e);
  }
  return credentials;
}

async function getDriveApi(credentials, lang) {
  // i18n hints
  // - 0 EN_US
  // - 1 ZH_CN
  const i18nHints = {
    isNeedSiteId: [
      ["Do you want to get SharePoint SiteId ?", "YES", "NO"],
      ["是否获取 SharePoint SiteId ?", "是", "否"],
    ],
    hostName: [
      "To get the SharePoint SiteID, You must specify:\n1. SharePoint site host (e.g., cent.sharepoint.com)",
      "为获取 SharePoint Site，你需要提供如下两个参数:\n1. SharePoint site host (比如：cent.sharepoint.com)",
    ],
    sitePath: [
      "SharePoint sites path (e.g., /sites/centUser)",
      "SharePoint sites path (比如：/sites/centUser)",
    ],
  };

  const { account_type, deploy_type, access_token } = credentials;
  const graphApi = account_type
    ? "https://graph.microsoft.com/v1.0"
    : "https://microsoftgraph.chinacloudapi.cn/v1.0";
  if (!deploy_type) {
    // SharePoint
    let questions = [
      {
        type: "list",
        name: "isNeedSiteId",
        message: i18nHints.isNeedSiteId[lang][0],
        choices: [
          {
            value: 1,
            name: i18nHints.isNeedSiteId[lang][1],
          },
          {
            value: 0,
            name: i18nHints.isNeedSiteId[lang][2],
          },
        ],
      },
    ];
    let res = await prompt(questions);
    if (res.isNeedSiteId) {
      questions = [
        {
          type: "input",
          name: "hostName",
          message: i18nHints.hostName[lang],
        },
        {
          type: "input",
          name: "sitePath",
          message: i18nHints.sitePath[lang],
        },
      ];
      res = await prompt(questions);

      console.log("Grab site-id from ms-graph");
      res = await fetch(
        `${graphApi}/sites/${res.hostName}:${res.sitePath}?$select=id`,
        {
          headers: {
            Authorization: `bearer ${access_token}`,
          },
        },
      );

      if (res.ok) {
        data = await res.json();
        credentials.drive_api = `${graphApi}/sites/${data.id}/drive`;
        credentials.site_id = data.id;
      }
    }
  } else {
    // Onedrive
    credentials.drive_api = `${graphApi}/me/drive`;
  }
  credentials.graph_api = graphApi;
}

function delTmpKeys(credentials, keys) {
  keys.forEach((key) => Reflect.deleteProperty(credentials, key));
}

(async () => {
  // Command line arguments parser
  const argumets = process.argv.slice(2);
  // Default: don't save, lang is EN
  let [isSave, lang, isLangSpecified] = [0, 0, 0];

  argumets.forEach((e) => {
    switch (e) {
      case "-s":
      case "--save": {
        isSave = 1;
        break;
      }
      case "-l":
      case "--lang": {
        isLangSpecified = 1;
        break;
      }
      case "CN":
      case "EN": {
        if (e === "CN" && isLangSpecified) lang = 1;
      }
    }
  });

  const credentials = await acquireToken(await init(lang));
  await getDriveApi(credentials, lang);
  delTmpKeys(credentials, ["code", "account_type", "deploy_type"]);

  if (isSave) {
    writeFileSync(
      resolve("./.env"),
      Object.keys(credentials).reduce((env, e) => {
        return `${env}${e} = ${credentials[e]}${EOL}`;
      }, ""),
    );
    console.warn(
      lang
        ? "生成的验证信息已保存到  ./.env , enjoy! 🎉"
        : "Saved generated credentials to ./.env , enjoy! 🎉",
    );
  } else {
    console.log(credentials);
  }
})();
