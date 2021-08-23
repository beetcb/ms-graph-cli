<p align="center">
    <img src="media/demo.svg" alt="demo" width="600">
  <h3 align="center">ms-graph-cli: tiny & elegant cli to authenticate microsoft graph</h3>
</p>

## Description

`ms-graph-cli` helps you run through microsoft's
[get access on behalf of a user](https://docs.microsoft.com/en-us/graph/auth-v2-user) easily! Created mainly for helping **onedrive & sharepoint** get the
`access-token` and `refresh-token` to access ms-graph API.

## Graph permissons needed

- onedrive: `Files.Read.All Files.ReadWrite.All offline_access`
- sharepoint: `Sites.Read.All Sites.ReadWrite.All offline_access`

## CLI usage

**!Note**: To automate the redirection process, `ms-graph-cli` needs your app's `redirect_uri` set to `http://localhost:3000`, the port can be changed as long as you have system permission to create a http server on that port

If you are somehow unable to meet the requirements of `redirect_uri`, please use the **[legacy version][legacy-version]**

```bash
# Print generated credentials to stdout
npx @beetcb/ms-graph-cli@next

# Save generated credentials to .env file
npx @beetcb/ms-graph-cli@next -s

# Specify the display language, support CN \ EN, default is EN
npx @beetcb/ms-graph-cli@next -l CN

# Or using them both
npx @beetcb/ms-graph-cli@next -s -l CN
```

## Generated credentials

**It's a `object`(maybe `.env`-fromatted) contains following key-value pairs:**

- `access_token`: use it to access ms-graph
- `refresh_token`: use it to refresh the `access_token`
- `redirect_uri`: your application redirect uri
- `client_id`: your application client id
- `client_secret`: your application client secret(this can be ignored when using
  public client)
- `auth_endpoint`: api endpoint to request token
- `drive_api`: api endpoint to access your drive resource
- `graph_api`: api endpoint to access ms-graph
- `site_id?`: sharepoint site id

All fields in the object are your private information, please keep it safe.

## TODO

- [x] Create a local server to catch the redirect `code`

[legacy-version]: https://github.com/beetcb/ms-graph-cli/tree/1d09dbc6ecc88b3429e3aac17d002b01f8848164#cli-usage
