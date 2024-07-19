const {SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder} = require("discord.js");

function randInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("sacrifice")
    	.setDescription("Gambling sacrifice"),
    async execute(interaction, Database) {
		//This wont actually stop you from gambling if there are no roles, but i don't think people would be happy
		if (!interaction.inGuild()) {
			interaction.reply({content: "Please run this in a guild!", ephemeral: true})
			return null
		}
		let guildData = await Database.models.Guild.findOne({where: {guildId: interaction.guildId}})
		if (!guildData) {
			interaction.reply("The server has not been initialized! Please contact an administrator of this server and beg them to set it up.")
			return null
		}
		if ((await guildData.getRanks({where: {sacrifice: true}})).length == 0) {
			interaction.reply("This server has no special ranks to gamble for! This server isnt fun")
			return null
		}
		let userData = (await guildData.getUsers({where: {userId: interaction.member.id}}))[0]
		if (!userData) {
			userData = await Database.models.User.create({userId: interaction.member.id})
			guildData.addUsers(userData)
		}
		let inventory = await userData.getRoles()
		if (inventory.length == 0) {
			interaction.reply({content: "You have nothing to lose...", ephemeral: true})
			return null
		}
		let sacrifices = new StringSelectMenuBuilder()
			.setCustomId("sacrificePicker")
			.setMaxValues(inventory.length)
			.setPlaceholder("Pick some roles to offer...")
		let options = []
		for (var role of inventory) {
			var discordRole = await interaction.guild.roles.fetch(role.roleId, 1)

			var option = new StringSelectMenuOptionBuilder()
			if (role) {
				option.setLabel(discordRole.name)
				option.setValue(`${role.roleId}`)
			} else {
				option.setLabel(`${role.roleId}`)
				option.setDescription("This role doesn't exist. It has value?")
				option.setValue(`${role.roleId}`)
			}
			options.push(option)
		}
		sacrifices.setOptions(options)
		let sacrificeButton = new ButtonBuilder()
			.setCustomId("gamble")
			.setLabel('Lock In')
			.setStyle(ButtonStyle.Danger)
		let topRow = new ActionRowBuilder()
			.addComponents(sacrifices)
		let bottomRow = new ActionRowBuilder()
			.addComponents(sacrificeButton)
		let content = ""
		let filter = (inter) => inter.member.id == interaction.member.id;
		let response = await interaction.reply({content: content, components: [topRow, bottomRow]})
		let collector = response.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000*5 }); //valid for 5 minutes

		collector.on('collect', async i => {
			await guildData.reload()
			await userData.reload()
			i.update("a")
		})
		collector.on("end", async (collected, reason) => {
			if (reason == "time") {
				content += "\nGambling session ended."
			} else if (reason == "cap") {
				content += `\nThis gambling session is over! You can gamble <t:${Math.floor((userData.lastGamble + GAMBLECAPCOOLDOWN)/1000)}:R>`
			}
			interaction.editReply({content: content, components: []})
		})
    },
}
