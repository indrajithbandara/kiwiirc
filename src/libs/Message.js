import _ from 'lodash';
import * as TextFormatting from 'src/helpers/TextFormatting';
import state from './state';

let nextId = 0;

export default class Message {
    constructor(message, user) {
        this.id = nextId++;
        this.time = message.time || Date.now();
        this.nick = message.nick;
        this.message = message.message;
        this.type = message.type || 'message';
        this.type_extra = message.type_extra;
        this.ignore = false;
        this.mentioned_urls = [];
        this.html = '';

        // We don't want the user object to be enumerable
        Object.defineProperty(this, 'user', {
            value: user,
        });
    }

    parseHtml(messageList) {
        if (this.html) {
            return this.html;
        }

        // We only want to format emojis + extra formatting for actual message buffers. Other
        // buffers such as *raw shouldnt have highlights or emojis
        let allowCharacterReplacements = messageList.buffer.isQuery() ||
            messageList.buffer.isChannel();

        let words = this.message.split(' ');
        words = words.map((word, wordIdx) => {
            let parsed;

            let linkified = TextFormatting.linkifyUrls(word, {
                addHandle: true,
                handleClass: 'fa fa-chevron-right kiwi-messagelist-message-linkhandle',
            });
            if (linkified.urls.length > 0) {
                this.mentioned_urls = this.mentioned_urls.concat(linkified.urls);
            }
            if (linkified.html !== word) return linkified.html;

            parsed = TextFormatting.linkifyChannels(word);
            if (parsed !== word) return parsed;

            parsed = TextFormatting.linkifyUsers(word, messageList.buffer.users);
            if (parsed !== word) return parsed;

            if (allowCharacterReplacements && state.setting('buffers.show_emoticons')) {
                parsed = TextFormatting.addEmojis(
                    { word, words, wordIdx },
                    state.setting('emojis'),
                    state.setting('emojiLocation')
                );
                if (parsed !== word) return parsed;
            }

            return _.escape(word);
        });

        let parsed = words.join(' ');
        let useExtraFormatting = allowCharacterReplacements &&
            messageList.useExtraFormatting &&
            this.type === 'privmsg';

        parsed = TextFormatting.ircCodesToHtml(parsed, useExtraFormatting);

        this.html = parsed;
        return this.html;
    }


}
