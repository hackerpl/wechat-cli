import { openAsBlob } from 'node:fs';
import path from 'node:path';
import { CliError, WechatApiError } from './errors.js';

const API_ORIGIN = 'https://api.weixin.qq.com';

async function request({ pathname, method = 'GET', searchParams, jsonBody, formData }) {
  const url = new URL(pathname, API_ORIGIN);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = {
    Accept: 'application/json, */*'
  };

  let body;
  if (jsonBody !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(jsonBody);
  } else if (formData) {
    body = formData;
  }

  const response = await fetch(url, {
    method,
    headers,
    body
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new CliError(`Request failed with HTTP ${response.status}. ${details}`.trim());
  }

  return response;
}

async function parseWechatJson(response) {
  const data = await response.json();

  if (typeof data?.errcode === 'number' && data.errcode !== 0) {
    throw new WechatApiError(data.errmsg || 'unknown error', data.errcode, data);
  }

  return data;
}

async function authedJsonRequest(accessToken, options) {
  const response = await request({
    ...options,
    searchParams: {
      ...(options.searchParams ?? {}),
      access_token: accessToken
    }
  });

  return parseWechatJson(response);
}

export async function fetchStableAccessToken({ appid, appsecret, forceRefresh = false }) {
  const response = await request({
    pathname: '/cgi-bin/stable_token',
    method: 'POST',
    jsonBody: {
      grant_type: 'client_credential',
      appid,
      secret: appsecret,
      force_refresh: forceRefresh
    }
  });

  return parseWechatJson(response);
}

export async function getMaterialCount(accessToken) {
  return authedJsonRequest(accessToken, {
    pathname: '/cgi-bin/material/get_materialcount',
    method: 'GET'
  });
}

export async function deletePermanentMaterial(accessToken, mediaId) {
  return authedJsonRequest(accessToken, {
    pathname: '/cgi-bin/material/del_material',
    method: 'POST',
    jsonBody: {
      media_id: mediaId
    }
  });
}

export async function addDraft(accessToken, payload) {
  return authedJsonRequest(accessToken, {
    pathname: '/cgi-bin/draft/add',
    method: 'POST',
    jsonBody: payload
  });
}

export async function uploadPermanentMaterial(accessToken, { type, filePath, title, introduction }) {
  const form = new FormData();
  const blob = await openAsBlob(path.resolve(filePath));
  form.set('media', blob, path.basename(filePath));

  if (type === 'video') {
    form.set('description', JSON.stringify({
      title,
      introduction
    }));
  }

  return authedJsonRequest(accessToken, {
    pathname: '/cgi-bin/material/add_material',
    method: 'POST',
    searchParams: { type },
    formData: form
  });
}

export async function getPermanentMaterial(accessToken, mediaId) {
  const response = await request({
    pathname: '/cgi-bin/material/get_material',
    method: 'POST',
    searchParams: {
      access_token: accessToken
    },
    jsonBody: {
      media_id: mediaId
    }
  });

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json') || contentType.startsWith('text/')) {
    return {
      kind: 'json',
      data: await parseWechatJson(response)
    };
  }

  return {
    kind: 'binary',
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
    contentDisposition: response.headers.get('content-disposition') || ''
  };
}
