// Blatantly stolen from https://github.com/sk-zk/lookaround-map/blob/main/static/auth.js

import { CORS_PROXY } from "./options";
import Proto from "./proto";

const TOKEN_P1 = "4cjLaD4jGRwlQ9U"
const MANIFEST_URL = "https://gspe35-ssl.ls.apple.com/geo_manifest/dynamic/config?application=geod" +
    "&application_version=1&country_code=US&hardware=MacBookPro11,2&os=osx" +
    "&os_build=20B29&os_version=11.0.1"

var GLOBAL_TOKENP2 = undefined;


export class Authenticator {
    
    private sessionId : string;
    
    
    constructor() {
        this.sessionId = null;
    }

    async init() {
        await this.refreshCredentials();
    }

    async refreshCredentials() {
        this.sessionId = this.#generateSessionId();
    }

    hasSession() {
        return this.sessionId != null;
    }


    async getTokenP2() {

        if (GLOBAL_TOKENP2 == undefined) {
            GLOBAL_TOKENP2 = (await this.getResourceManifest()).tokenP2;
        }
        return GLOBAL_TOKENP2;
    }

    async authenticateUrl(url) {
        const urlObj = new URL(url);
        
        let p2 = await this.getTokenP2();
        const tokenP3 = this.#generateTokenP3();
        const token = TOKEN_P1 + p2 + tokenP3;
        const timestamp = Math.floor(Date.now() / 1000) + 4200;
        const separator = urlObj.search ? "&" : "?";

        let urlPath = urlObj.pathname;
        if (urlObj.search) {
            urlPath += urlObj.search;
        }
        const plaintext = `${urlPath}${separator}sid=${this.sessionId}${timestamp}${tokenP3}`;
        const plaintextBytes = new TextEncoder().encode(plaintext);
        const key = await sha256(token);
        const ciphertext = await aes(key, plaintextBytes);
        const ciphertextB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
        const ciphertextUrl = encodeURIComponent(ciphertextB64);
        const accessKey = `${timestamp}_${tokenP3}_${ciphertextUrl}`;
        const final = `${url}${separator}sid=${this.sessionId}&accessKey=${accessKey}`;
        return final;
    }

    #generateSessionId() {
        let id = "";
        for (let i = 0; i < 40; i++) {
            const digit = (Math.random() * 10) | 0;
            id += digit.toString();
        }
        return id;
    }

    async getResourceManifest() {
        const response = await fetch(CORS_PROXY+MANIFEST_URL);
        let pb = await response.arrayBuffer();
        return await Proto.parseResourceManifest(pb);
    }

    #generateTokenP3() {
        const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
        let token = "";
        for (let i = 0; i < 16; i++) {
            const idx = (Math.random() * chars.length) | 0;
            token += chars[idx];
        }
        return token;
    }
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
    return hashBuffer;
}

async function aes(key, encodedMessage) {
    const iv = new Uint8Array(16); // 16 zeroes
    const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        key,
        { name: "AES-CBC" },
        true,
        ["encrypt"]
    );
    return await window.crypto.subtle.encrypt(
        {
            name: "AES-CBC",
            iv,
        },
        cryptoKey,
        encodedMessage,
    );
}
