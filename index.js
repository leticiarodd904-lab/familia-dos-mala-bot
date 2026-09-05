require("dotenv").config();
const http = require("http");

const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActivityType,
  ChannelType
} = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Configure DISCORD_TOKEN, CLIENT_ID e GUILD_ID no arquivo .env");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Mostra a latência do bot."),
  new SlashCommandBuilder().setName("ajuda").setDescription("Mostra os comandos disponíveis."),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Mostra informações do servidor."),
  new SlashCommandBuilder().setName("userinfo").setDescription("Mostra informações de um membro.")
    .addUserOption(o => o.setName("usuario").setDescription("Membro para consultar").setRequired(false)),
  new SlashCommandBuilder().setName("avatar").setDescription("Mostra o avatar de um usuário.")
    .addUserOption(o => o.setName("usuario").setDescription("Usuário").setRequired(false)),
  new SlashCommandBuilder().setName("say").setDescription("Faz o bot enviar uma mensagem.")
    .addStringOption(o => o.setName("mensagem").setDescription("Mensagem").setRequired(true)),
  new SlashCommandBuilder().setName("clear").setDescription("Apaga mensagens recentes.")
    .addIntegerOption(o => o.setName("quantidade").setDescription("1 a 100").setMinValue(1).setMaxValue(100).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("kick").setDescription("Expulsa um membro.")
    .addUserOption(o => o.setName("usuario").setDescription("Membro").setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName("ban").setDescription("Bane um membro.")
    .addUserOption(o => o.setName("usuario").setDescription("Membro").setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName("timeout").setDescription("Coloca um membro em timeout.")
    .addUserOption(o => o.setName("usuario").setDescription("Membro").setRequired(true))
    .addIntegerOption(o => o.setName("minutos").setDescription("1 a 40320 minutos").setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName("motivo").setDescription("Motivo").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName("unban").setDescription("Remove o banimento de um usuário.")
    .addStringOption(o => o.setName("id").setDescription("ID do usuário").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName("lock").setDescription("Trava o canal atual.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName("unlock").setDescription("Destrava o canal atual.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName("slowmode").setDescription("Define o modo lento do canal.")
    .addIntegerOption(o => o.setName("segundos").setDescription("0 a 21600").setMinValue(0).setMaxValue(21600).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName("anuncio").setDescription("Envia um anúncio em embed.")
    .addStringOption(o => o.setName("titulo").setDescription("Título").setRequired(true))
    .addStringOption(o => o.setName("mensagem").setDescription("Texto").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("cargo").setDescription("Adiciona ou remove um cargo de um membro.")
    .addSubcommand(s => s.setName("dar").setDescription("Dá um cargo.")
      .addUserOption(o => o.setName("usuario").setDescription("Membro").setRequired(true))
      .addRoleOption(o => o.setName("cargo").setDescription("Cargo").setRequired(true)))
    .addSubcommand(s => s.setName("tirar").setDescription("Remove um cargo.")
      .addUserOption(o => o.setName("usuario").setDescription("Membro").setRequired(true))
      .addRoleOption(o => o.setName("cargo").setDescription("Cargo").setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder().setName("emoji").setDescription("Mostra informações de um emoji.")
    .addStringOption(o => o.setName("emoji").setDescription("Emoji do servidor").setRequired(true))
].map(c => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log("Comandos registrados no servidor.");
}

function isHigherOrEqual(actor, target) {
  if (!actor || !target) return false;
  return actor.roles.highest.comparePositionTo(target.roles.highest) >= 0;
}

client.once("ready", async () => {
  console.log(`Online como ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "a Família dos Mala 👀", type: ActivityType.Watching }],
    status: "online"
  });

  try {
    await registerCommands();
  } catch (err) {
    console.error("Erro ao registrar comandos:", err);
  }
});

client.on("guildMemberAdd", async member => {
  const roleId = process.env.AUTO_ROLE_ID;
  if (roleId) {
    const role = member.guild.roles.cache.get(roleId);
    if (role && role.editable) {
      try { await member.roles.add(role, "Cargo automático de entrada"); } catch {}
    }
  }

  const channelId = process.env.WELCOME_CHANNEL_ID;
  const channel = channelId ? member.guild.channels.cache.get(channelId) : null;
  if (channel && channel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setTitle("👋 Bem-vindo(a) à Família dos Mala!")
      .setDescription(`Seja bem-vindo(a), ${member}! Leia as regras e aproveite a comunidade.`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
    channel.send({ embeds: [embed] }).catch(() => {});
  }
});

client.on("guildMemberRemove", async member => {
  const channelId = process.env.GOODBYE_CHANNEL_ID;
  const channel = channelId ? member.guild.channels.cache.get(channelId) : null;
  if (channel && channel.isTextBased()) {
    channel.send(`👋 **${member.user.tag}** saiu da Família dos Mala.`).catch(() => {});
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    const { commandName } = interaction;

    if (commandName === "ping") {
      return interaction.reply(`🏓 Pong! Latência: **${client.ws.ping}ms**`);
    }

    if (commandName === "ajuda") {
      const embed = new EmbedBuilder()
        .setTitle("🤖 Família dos Mala — Comandos")
        .setDescription("Bot multifuncional da comunidade.")
        .addFields(
          { name: "🔧 Utilidade", value: "`/ping` `/ajuda` `/serverinfo` `/userinfo` `/avatar` `/emoji`" },
          { name: "🛡️ Moderação", value: "`/clear` `/kick` `/ban` `/unban` `/timeout` `/lock` `/unlock` `/slowmode`" },
          { name: "📢 Administração", value: "`/anuncio` `/say` `/cargo dar` `/cargo tirar`" }
        )
        .setFooter({ text: "Família dos Mala" });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === "serverinfo") {
      const g = interaction.guild;
      const embed = new EmbedBuilder()
        .setTitle(`📊 ${g.name}`)
        .addFields(
          { name: "👑 Dono", value: `<@${g.ownerId}>`, inline: true },
          { name: "👥 Membros", value: String(g.memberCount), inline: true },
          { name: "💬 Canais", value: String(g.channels.cache.size), inline: true },
          { name: "🎭 Cargos", value: String(g.roles.cache.size), inline: true },
          { name: "🆔 ID", value: g.id, inline: true }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "userinfo") {
      const user = interaction.options.getUser("usuario") || interaction.user;
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      const embed = new EmbedBuilder()
        .setTitle(`👤 ${user.username}`)
        .setThumbnail(user.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: "ID", value: user.id, inline: true },
          { name: "Conta criada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
          { name: "Entrou no servidor", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Não disponível", inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "avatar") {
      const user = interaction.options.getUser("usuario") || interaction.user;
      return interaction.reply(user.displayAvatarURL({ size: 1024, extension: "png" }));
    }

    if (commandName === "say") {
      return interaction.reply({ content: interaction.options.getString("mensagem"), allowedMentions: { parse: [] } });
    }

    if (commandName === "clear") {
      const amount = interaction.options.getInteger("quantidade");
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({ content: `🧹 Apaguei **${deleted.size}** mensagens.`, ephemeral: true });
    }

    if (["kick", "ban", "timeout"].includes(commandName)) {
      const user = interaction.options.getUser("usuario");
      const reason = interaction.options.getString("motivo") || "Sem motivo informado";
      const target = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!target) return interaction.reply({ content: "❌ Não encontrei esse membro no servidor.", ephemeral: true });
      if (target.id === interaction.user.id) return interaction.reply({ content: "❌ Você não pode usar isso em si mesmo.", ephemeral: true });
      if (target.id === interaction.guild.ownerId) return interaction.reply({ content: "❌ O dono do servidor não pode ser moderado pelo bot.", ephemeral: true });
      if (!isHigherOrEqual(interaction.member, target)) return interaction.reply({ content: "❌ Seu cargo precisa estar acima do cargo do alvo.", ephemeral: true });
      if (!target.moderatable && commandName !== "kick") return interaction.reply({ content: "❌ Não consigo moderar esse membro. Verifique a hierarquia dos cargos.", ephemeral: true });

      if (commandName === "kick") {
        await target.kick(reason);
        return interaction.reply(`👢 **${user.tag}** foi expulso. Motivo: ${reason}`);
      }
      if (commandName === "ban") {
        await target.ban({ reason, deleteMessageSeconds: 86400 });
        return interaction.reply(`🔨 **${user.tag}** foi banido. Motivo: ${reason}`);
      }
      const minutes = interaction.options.getInteger("minutos");
      await target.timeout(minutes * 60 * 1000, reason);
      return interaction.reply(`🔇 **${user.tag}** recebeu timeout por **${minutes} min**. Motivo: ${reason}`);
    }

    if (commandName === "unban") {
      const id = interaction.options.getString("id");
      await interaction.guild.members.unban(id);
      return interaction.reply(`✅ O usuário **${id}** foi desbanido.`);
    }

    if (commandName === "lock" || commandName === "unlock") {
      const everyone = interaction.guild.roles.everyone;
      await interaction.channel.permissionOverwrites.edit(everyone, {
        SendMessages: commandName === "unlock" ? null : false
      });
      return interaction.reply(commandName === "lock" ? "🔒 Canal trancado." : "🔓 Canal destrancado.");
    }

    if (commandName === "slowmode") {
      const seconds = interaction.options.getInteger("segundos");
      await interaction.channel.setRateLimitPerUser(seconds);
      return interaction.reply(`🐌 Modo lento definido para **${seconds}s**.`);
    }

    if (commandName === "anuncio") {
      const title = interaction.options.getString("titulo");
      const message = interaction.options.getString("mensagem");
      const embed = new EmbedBuilder().setTitle(`📢 ${title}`).setDescription(message).setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (commandName === "cargo") {
      const sub = interaction.options.getSubcommand();
      const user = interaction.options.getUser("usuario");
      const role = interaction.options.getRole("cargo");
      const member = await interaction.guild.members.fetch(user.id);

      if (role.managed) return interaction.reply({ content: "❌ Esse cargo é gerenciado por uma integração e não pode ser atribuído.", ephemeral: true });
      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "❌ O cargo escolhido está acima (ou no mesmo nível) do meu cargo.", ephemeral: true });
      }

      if (sub === "dar") {
        await member.roles.add(role);
        return interaction.reply(`✅ Cargo ${role} adicionado a **${user.tag}**.`);
      } else {
        await member.roles.remove(role);
        return interaction.reply(`✅ Cargo ${role} removido de **${user.tag}**.`);
      }
    }

    if (commandName === "emoji") {
      const raw = interaction.options.getString("emoji");
      const match = raw.match(/^<a?:([A-Za-z0-9_]+):(\d+)>$/);
      if (!match) return interaction.reply({ content: "❌ Envie um emoji personalizado do Discord, por exemplo: `<:nome:ID>`.", ephemeral: true });
      return interaction.reply(`😀 **${match[1]}** — ID: \`${match[2]}\`\n${raw}`);
    }

  } catch (error) {
    console.error(error);
    const message = "❌ Ocorreu um erro ao executar esse comando.";
    if (interaction.replied || interaction.deferred) interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
    else interaction.reply({ content: message, ephemeral: true }).catch(() => {});
  }
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);


// Servidor HTTP mínimo para a hospedagem gratuita.
const PORT = process.env.PORT || 3000;
const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Família dos Mala — bot online");
});
healthServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor de saúde ativo na porta ${PORT}`);
});

client.login(TOKEN);
