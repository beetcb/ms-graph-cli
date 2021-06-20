<p align="center">
    <img src="media/demo.svg" alt="demo" width="600">
  <h3 align="center">ms-graph-cli, tiny & elegant cli to authenticate microsoft graph</h3>
</p>

## Description

`ms-graph-cli` helps you run through microsoft's
[get access on behalf of a user](https://docs.microsoft.com/en-us/graph/auth-v2-user)
at ease!. Created mainly for helping **onedrive & sharepoint** get the
`access-token` and `refresh-token` to access ms-graph.

## Graph permissons needed

- onedrive: `Files.Read.All Files.ReadWrite.All offline_access`
- sharepoint: `Sites.Read.All Sites.ReadWrite.All offline_access`

## CLI usage

**!Note**: To automate the redirection process, `ms-graph-cli` needs your app's `redirect_uri` to be `http://localhost:3000`, the port can be changed as long as you have system permission to create a http server on that port

```bash
# Print generated credentials to stdout
npx @beetcb/ms-graph-cli

# Save generated credentials to .env file
npx @beetcb/ms-graph-cli -s

# Specify the display language, support CN \ EN, default is EN
npx @beetcb/ms-graph-cli -l CN

# Or using them both
npx @beetcb/ms-graph-cli -s -l CN
```

## Generated credentials

**It's a `object` contains following key-value pairs:**

- `access_token`: use it to access ms-graph
- `refresh_token`: use it to refresh the `access_token`
- `redirect_uri`: your application redirect uri
- `client_id`: your application client id
- `client_secret`: your application client secret(this can be ignored when using
  public client)
- `auth_endpoint`: api endpoint to request token
- `drive_api`: api endpoint to access your drive resource
- `graph_api`: api endpoint to access ms-graph
- `site_id`: sharepoint site id

These are your secrets 💕, please keep it safe.

## TODO

- [ ] Create a local server to catch the redirect `code`
