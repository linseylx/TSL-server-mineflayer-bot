module.exports = function autoResourcePack(bot, options = {}) {

    const defaultOptions = {
        acceptPack: true,
        acceptDelay: 800,
        debug: true
    };

    const opts = { ...defaultOptions, ...options };

    const log = (msg) => {
        if (opts.debug) {
            console.log(`[auto-res-pack] ${msg}`);
        }
    };

    const setupListener = () => {
        if (!bot._client) {
            bot.once('inject_allowed', setupListener);
            return;
        }

        bot._client.on('add_resource_pack', (data) => {
            const { uuid } = data;

            if (!opts.acceptPack) {
                bot._client.write('resource_pack_receive', { uuid, result: 1 });
                log(`资源包已拒绝 (UUID: ${uuid})`);
                return;
            }

            bot._client.write('resource_pack_receive', { uuid, result: 3 });
            log(`资源包下载确认 (UUID: ${uuid})`);

            setTimeout(() => {
                if (bot._client) {
                    bot._client.write('resource_pack_receive', { uuid, result: 0 });
                    log(`资源包加载完成 (UUID: ${uuid})`);
                }
            }, opts.acceptDelay);
        });

        log('插件已激活，等待服务器推送资源包...');
    };

    if (bot._client) {
        setupListener();
    } else {
        bot.once('inject_allowed', setupListener);
    }
};