import {
  Client,
  GatewayIntentBits,
  Partials,
  Routes,
  REST,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Interaction,
  TextChannel,
  ActivityType,
  EmbedBuilder,
} from "discord.js";
import "dotenv/config";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

const adminChannelId = "1370152668076572752";
const applicationAdminId = "307210753415577610";
const applyChannel = "1370152686133186760";

client.once("ready", async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  client.user?.setActivity("editing videos", {
    type: ActivityType.Listening,
  });

  client.user?.setStatus("dnd");
  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN as string
  );
  const command = new SlashCommandBuilder()
    .setName("apply")
    .setDescription("Apply to join Surge");

  await rest.put(Routes.applicationCommands(client.user!.id), {
    body: [command.toJSON()],
  });

  console.log("Successfully registered application commands.");
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.channelId !== applyChannel) {
    return;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === "apply") {
    const modal = new ModalBuilder()
      .setCustomId("application_modal")
      .setTitle("Surge Application")
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("tiktok_link")
            .setLabel("Enter your TikTok link")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("https://www.tiktok.com/@yourusername")
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("rank")
            .setLabel("Rank")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("e.g.: Immortal 3, Radiant")
        ),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("riot_id")
            .setLabel("Riot ID")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("e.g.: JohnDoe#1234")
            .setRequired(true)
        )
      );

    await interaction.showModal(modal);
  }
  if (
    interaction.isModalSubmit() &&
    interaction.customId === "application_modal"
  ) {
    const tiktokLink = interaction.fields.getTextInputValue("tiktok_link");
    const rank = interaction.fields.getTextInputValue("rank");
    const riotId = interaction.fields.getTextInputValue("riot_id");

    const adminChannel = (await client.channels.fetch(
      adminChannelId
    )) as TextChannel;

    const acceptButton = new ButtonBuilder()
      .setCustomId(`accept_${interaction.user.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Success);

    const rejectButton = new ButtonBuilder()
      .setCustomId(`reject_${interaction.user.id}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      acceptButton,
      rejectButton
    );

    await adminChannel.send({
      content: `📝 New application from <@${interaction.user.id}>:\n\n📱 TikTok: ${tiktokLink}\n🏅 Rank: ${rank}\n🎮 Riot Id: ${riotId}`,
      components: [row],
    });

    await interaction.reply({
      content: "✅ Your application has been submitted.",
      ephemeral: true,
    });
  }

  if (interaction.isButton()) {
    const [action, userId] = interaction.customId.split("_");

    if (interaction.user.id !== applicationAdminId) {
      await interaction.reply({
        content: `❗ Only the designated admin can process applications.`,
        ephemeral: true,
      });
      return;
    }

    const guild = client.guilds.cache.get(interaction.guildId!);
    if (!guild) {
      await interaction.reply({
        content: `❗ Guild not found.`,
        ephemeral: true,
      });
      return;
    }

    const member = guild.members.cache.get(userId);
    const user = await client.users.fetch(userId);
    if (!user || !member) {
      await interaction.reply({
        content: `❗ User not found.`,
        ephemeral: true,
      });
      return;
    }

    if (action === "accept") {
      await user.send({
        content: `✅ Your application has been accepted. Welcome to Surge!`,
      });

      const surgeRoleId = "1370159531618996284";

      await member.roles.add(surgeRoleId).catch((err) => {
        console.error("Failed to assign role:", err);
      });
      await interaction.reply({
        content: `✅ Accepted <@${userId}>'s application.`,
        ephemeral: true,
      });
    } else if (action === "reject") {
      await user.send({
        content: `❌ Your application has been rejected. Please try again later.`,
      });
      await interaction.reply({
        content: `❌ Rejected <@${userId}>'s application.`,
        ephemeral: true,
      });
    }
  }
});

client.on("messageCreate", async (message) => {
  if (
    !message.guild ||
    message.author.bot ||
    message.channel.id !== applyChannel
  )
    return;

  if (!message.content.startsWith("/")) {
    await message.delete().catch(console.error);
    return;
  }
});

client.on("guildMemberAdd", async (member) => {
  const autoRoleId = "1370163478979153960";
  const welcomeChannel = "1370162318134087791";
  const channel = member.guild.channels.cache.get(
    welcomeChannel
  ) as TextChannel;

  if (!channel || !channel.isTextBased()) return;

  const publicEmbed = new EmbedBuilder()
    .setTitle("👋 Welcome to Surge!")
    .setDescription(
      `Hey, <@${member.id}>! Thanks for joining Surge! Please read the rules before posting in the server.`
    )
    .setColor(0x00ae86)
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: "We're glad to have you here!" });

  (channel as TextChannel).send({ embeds: [publicEmbed] }).catch(console.error);

  try {
    await member.roles.add(autoRoleId);
    console.log(`Added role ${autoRoleId} to ${member.user.username}`);
  } catch (error) {
    console.error("Failed to add role:", error);
  }

  const dmEmbed = new EmbedBuilder()
    .setTitle("👋 Welcome to Surge!")
    .setDescription(
      `Thanks for joining Surge!\n\nHere's what you should do next:\n ✅ Read the rules\n ✅ Submit your application\n`
    )
    .setColor(0x00ae86)
    .setFooter({ text: "We're glad to have you here!" });

  try {
    await member.send({ embeds: [dmEmbed] }).catch(console.error);
  } catch (error) {
    console.error("Failed to send DM:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);
