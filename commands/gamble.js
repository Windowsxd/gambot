const {SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType} = require("discord.js");

function randInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("gamble")
    	.setDescription("gamble for roles!!!!"),
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
		if ((await guildData.getRanks({where: {sacrifice: false}})).length == 0) {
			interaction.reply("This server has no normal ranks to gamble for! Please contact an administrator, and weep.")
		}
		let userData = (await guildData.getUsers({where: {userId: interaction.member.id}}))[0]
		if (!userData) {
			userData = await Database.models.User.create({userId: interaction.member.id})
			guildData.addUsers(userData)
		}
		
		if (userData.amountGambled >= guildData.gambleCap) {
			if (Date.now() - userData.lastGamble < guildData.gambleDebounce) {
				interaction.reply({content: `Try again <t:${Math.floor((userData.lastGamble + guildData.gambleDebounce)/1000)}:R>`, ephemeral: true})
				return null
			} else {
				userData.amountGambled = 0
				await userData.save()
			}
		}
		let gambleButton = new ButtonBuilder()
			.setCustomId("gamble")
			.setLabel('Gamble')
			.setStyle(ButtonStyle.Primary)

		let row = new ActionRowBuilder()
			.addComponents(gambleButton)
		let content = []
		function pushContent(cont) {
			content.push(cont)
			if (content.length > 10) {
				content.splice(0,1)
			}
		}
		let filter = (inter) => inter.member.id == interaction.member.id;
		let response = await interaction.reply({content: content.join("\n"), components: [row]})
		let collector = response.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000*5 }); //valid for 5 minutes

		collector.on('collect', async i => {
			await guildData.reload()
			await userData.reload()
			if (userData.amountGambled >= guildData.gambleCap) {
				collector.stop("time")
				return null
			}
			userData.lastGamble = Date.now()
			await userData.save()
			let allRanks = await guildData.getRanks({where: {sacrifice: false}})
			if (allRanks.length == 0) {
				pushContent("This server has no ranks to gamble for! Please contact an administrator, and weep.")
				collector.stop()
				return null
			}
			let randomNum = Math.random()
			let totalProbability = allRanks.map(function(rank) {return rank.probability}).reduce(function(a,b) {return a+b}, 0)
			totalProbability = totalProbability/100
			let goneThrough = 0
			userData.amountGambled += 1
			await userData.save()
			for (var rank of allRanks) {
				if (rank.probability == 0) {continue}
				let chanceForRank = (rank.probability/100)/(1*(totalProbability<=1) + totalProbability*(totalProbability>1))
				if (randomNum <= chanceForRank+goneThrough && randomNum > goneThrough) { //Won this rank of roles
					let roles = await rank.getRoles()
					if (roles.length == 0) {
						pushContent(`(${userData.amountGambled}/${guildData.gambleCap}) You would have gotten something, but no roles exist in this rank! go cry to admins.`)
						if (userData.amountGambled >= guildData.gambleCap) {collector.stop("cap"); return null}
						await i.update(content.join("\n"))
						return null
					}
					let randomRole = roles[randInt(0, roles.length-1)]
					let userRoles = await userData.getRoles()
					let killMe = false
					for (userRole of userRoles) {
						if (userRole.roleId == randomRole.roleId) {
							killMe = true
							break
						}
					}
					if (killMe == true) {break}
					await userData.addRoles(randomRole)
					pushContent(`(${userData.amountGambled}/${guildData.gambleCap}) You got <@&${randomRole.roleId}> (rank ${rank.name}!)`)
					if (userData.amountGambled >= guildData.gambleCap) {collector.stop("cap"); return null}
					await i.update(content.join("\n"))
					return null
				}
				goneThrough += chanceForRank
			}
			pushContent(`(${userData.amountGambled}/${guildData.gambleCap}) L you lost loser`)
			if (userData.amountGambled >= guildData.gambleCap) {collector.stop("cap"); return null}
			await i.update(content.join("\n"))
		})
		collector.on("end", async (collected, reason) => {
			if (reason == "time") {
				pushContent("Gambling session ended.")
			} else if (reason == "cap") {
				pushContent(`This gambling session is over! You can gamble <t:${Math.floor((userData.lastGamble + guildData.gambleDebounce)/1000)}:R>`)
			}
			interaction.editReply({content: content.join("\n"), components: []})
		})
    },
}
