## Description

`ms-graph-cli` helps you run through microsoft's [get access on behalf of a user](https://docs.microsoft.com/en-us/graph/auth-v2-user) at ease!. Created mainly for helping **onedrive & sharepoint** get the `access-token` and `refresh-token` to access ms-graph.

## Graph permissons needed

- onedrive: `Files.Read.All Files.ReadWrite.All offline_access`
- sharepoint: `Sites.Read.All Sites.ReadWrite.All offline_access`

## CLI usage

```bash
# Print generated credentials to stdout
npx @beetcb/ms-graph-cli

# Save generated credentials to .env file
npx @beetcb/ms-graph-cli --save
```

## Generated credentials

**It's a `object` contains following key-value pairs:**

- `access_token`: use it to access ms-graph
- `refresh_token`: use it to refresh the `access_token`
- `redirect_uri`: your application redirect uri
- `client_id`: your application client id
- `client_secret`: your application client secret(this can be ignored when using public client)
- `auth_endpoint`: api endpoint to request token
- `drive_api`: api endpoint to access your drive resource
- `graph_api`: api endpoint to access ms-graph
- `site_id`: sharepoint site id

These are your secret 💕, please keep it safe.
