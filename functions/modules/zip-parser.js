// functions/modules/zip-parser.js
// Facebook ZIP file parser using fflate

import { unzipSync } from 'fflate';
import { latin1ToUtf8 } from '../helpers/utils.js';

export function parseFacebookZip(arrayBuffer) {
    const unzipped = unzipSync(new Uint8Array(arrayBuffer));

    let followersJson = null;
    let followingJson = null;

    for (const filename in unzipped) {
        if (filename.includes('people_who_followed_you.json')) {
            followersJson = unzipped[filename];
        } else if (filename.includes('who_you') && filename.includes('followed.json')) {
            followingJson = unzipped[filename];
        }
    }

    if (!followersJson || !followingJson) {
        return { followers: null, following: null };
    }

    const followersData = JSON.parse(new TextDecoder().decode(followersJson));
    const followingData = JSON.parse(new TextDecoder().decode(followingJson));

    // Extract followers - just names (for Set lookup)
    const followersRaw = followersData.followers_v3 || followersData || [];
    const followers = followersRaw.map(entry => {
        if (entry.string_list_data && entry.string_list_data[0]) {
            return latin1ToUtf8(entry.string_list_data[0].value);
        }
        if (entry.name) {
            return latin1ToUtf8(entry.name);
        }
        return '';
    }).filter(Boolean);

    // Extract following - names WITH timestamps (for sorting/display)
    const followingRaw = followingData.following_v3 || followingData || [];
    const following = followingRaw.map(entry => {
        let name = '';
        let timestamp = 0;
        if (entry.string_list_data && entry.string_list_data[0]) {
            name = latin1ToUtf8(entry.string_list_data[0].value);
            timestamp = entry.string_list_data[0].timestamp || entry.timestamp || 0;
        } else if (entry.name) {
            name = latin1ToUtf8(entry.name);
            timestamp = entry.timestamp || 0;
        }
        return { name, timestamp };
    }).filter(item => item.name);

    return { followers, following };
}
