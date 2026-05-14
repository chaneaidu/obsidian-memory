"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripPrivateTags = stripPrivateTags;
exports.extractPrivateTags = extractPrivateTags;
exports.hasPrivateTags = hasPrivateTags;
function stripPrivateTags(text) {
    return text.replace(/<private>[\s\S]*?<\/private>/gi, '');
}
function extractPrivateTags(text) {
    const matches = [];
    const regex = /<private>[\s\S]*?<\/private>/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
    }
    return matches;
}
function hasPrivateTags(text) {
    return /<private>[\s\S]*?<\/private>/gi.test(text);
}
//# sourceMappingURL=tag-stripping.js.map