// In browser console or Node.js
import { keccak256, toUtf8Bytes } from 'ethers';
const integratorId = keccak256(toUtf8Bytes("companyname.com"));
console.log(integratorId);
