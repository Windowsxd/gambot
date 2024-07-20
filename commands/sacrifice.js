const {SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField} = require("discord.js");

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
		if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
			endingMessage = "This bot has no permissions to manage roles.... what are the admins doing??"
			collector.stop("error")
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
		let sacrificeStringMenus = []
		//Because of discord's 25 per menu limit, we need to break this into chunks.
		let amountMenus = Math.ceil(inventory.length/25)
		for (let i=0; i < amountMenus; i++) {
			let sacrificeMenu = new StringSelectMenuBuilder()
				.setCustomId(`sacrificeMenu${i}`)
				.setMinValues(0)
				.setPlaceholder(`(${i+1}/${amountMenus}) Pick some roles to offer...`)
			let options = []
			for (let roleIndex = i*25; roleIndex < i*25 + 25 && roleIndex < inventory.length; roleIndex++) {
				let role = inventory[roleIndex]
				var discordRole = await interaction.guild.roles.fetch(role.roleId, 1)
				var parentRank = (await guildData.getRanks({where: {id: role.RankId}}))[0]
				if (discordRole && parentRank) {
					let option = new StringSelectMenuOptionBuilder()
						.setLabel(discordRole.name)
						.setValue(`${role.roleId}`)
						.setDescription(`+${parentRank.sacrificeProbabilityAddition}%`)
					options.push(option)
				}
			}
			sacrificeMenu.setMaxValues(options.length)
			sacrificeMenu.setOptions(options)
			sacrificeStringMenus.push(sacrificeMenu)
		}
		let previousButton = new ButtonBuilder()
			.setCustomId("previous")
			.setLabel("<")
			.setDisabled(true)
			.setStyle(ButtonStyle.Secondary)
		let nextButton = new ButtonBuilder()
			.setCustomId("next")
			.setLabel(">")
			.setStyle(ButtonStyle.Secondary)
		
		let sacrificeButton = new ButtonBuilder()
			.setCustomId("sacrifice")
			.setLabel("Lock In")
			.setStyle(ButtonStyle.Danger)
		let nevermindButton = new ButtonBuilder()
			.setCustomId("nevermind")
			.setLabel("Actually, Nevermind")
			.setStyle(ButtonStyle.Secondary)
		let currentMenu = 0
		let topRow = new ActionRowBuilder()
			.addComponents([sacrificeStringMenus[currentMenu]])
		
		let bottomRow = new ActionRowBuilder()
		if (sacrificeStringMenus.length > 1) {
			bottomRow.addComponents([previousButton, sacrificeButton, nevermindButton, nextButton])
		} else {
			bottomRow.addComponents([sacrificeButton, nevermindButton])
		}
		let filter = (inter) => inter.member.id == interaction.member.id;
		let response = await interaction.reply({content: "", components: [topRow, bottomRow]})
		let collector = response.createMessageComponentCollector({ filter, componentType: ComponentType.Button, time: 60000*10 }); //valid for 10 minutes
		let rolesCollector = response.createMessageComponentCollector({ filter, componentType: ComponentType.StringSelect, time: 60000*10 }); //valid for 10 minutes
		let chosenRoles = []
		collector.on('collect', async i => {
			await guildData.reload()
			await userData.reload()
			if (i.customId == "sacrifice") {
				//They locked in
				collector.stop("lockin")
				rolesCollector.stop()
			} else if (i.customId == "nevermind") {
				collector.stop("backedout")
				rolesCollector.stop()
			} else if (i.customId == "previous") {
				currentMenu = Math.max(currentMenu - 1, 0)
				topRow = new ActionRowBuilder()
					.addComponents([sacrificeStringMenus[currentMenu]])
				previousButton.setDisabled(currentMenu == 0)
				nextButton.setDisabled(currentMenu == sacrificeStringMenus.length - 1)
				bottomRow = new ActionRowBuilder()
					.addComponents([previousButton, sacrificeButton, nevermindButton, nextButton])
				i.update({components: [topRow, bottomRow]})
			} else if (i.customId == "next") {
				currentMenu = Math.min(currentMenu + 1, sacrificeStringMenus.length - 1)
				topRow = new ActionRowBuilder()
					.addComponents([sacrificeStringMenus[currentMenu]])
				previousButton.setDisabled(currentMenu == 0)
				nextButton.setDisabled(currentMenu == sacrificeStringMenus.length - 1)
				bottomRow = new ActionRowBuilder()
					.addComponents([previousButton, sacrificeButton, nevermindButton, nextButton])
				i.update({components: [topRow, bottomRow]})
			}
		})
		rolesCollector.on('collect', async i => {
			await guildData.reload()
			await userData.reload()
			for (let option of i.component.options) {
				let optionInChosen = chosenRoles.indexOf(option.value) 
				if (optionInChosen != -1) {
					chosenRoles.splice(optionInChosen, 1)
				}
			}
			chosenRoles.push(...i.values)
			sacrificeStringMenus[currentMenu].options.forEach(option => option.setDefault(i.values.includes(option.data.value)))
			topRow = new ActionRowBuilder().addComponents(sacrificeStringMenus[currentMenu]);
			i.update({components: [topRow, bottomRow]})
		})
		collector.on("end", async (collected, reason) => {
			await guildData.reload()
			await userData.reload()
			if (reason == "time") {
				interaction.editReply({content: "It took you 10 minutes to pick stuff? Nah. Redo whatever you were doing. I don't want to wait that long.", components: []})
			} else if (reason == "lockin") {
				if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
					interaction.editReply({content: "The admins just took away my perms... sorry bud but I cant do this", components: []})
					return null
				}
				let allRanks = await guildData.getRanks({where: {sacrifice: true}})
				if (allRanks.length == 0) {
					interaction.editReply({content: "Between the time it took you to send this command and lock in, admins removed all special ranks. Sucks.", components: []})
					return null
				}
				for (let roleId of chosenRoles) {
					let roleData = (await userData.getRoles({where: {roleId: roleId}}))[0]
					if (!roleData) {
						interaction.editReply({content: "You were trying to sacrifice a role you don't have... I don't like that.", components: []})
						return null
					}
				}
				//The user confirmed has all roles. Remove them!!!!
				for (let roleId of chosenRoles) {
					let roleData = (await userData.getRoles({where: {roleId: roleId}}))[0]
					userData.removeRole(roleData)
				}
				await interaction.member.roles.remove(chosenRoles, "Sacrificed")
				let gambleButton = new ButtonBuilder()
					.setCustomId("gambleSac")
					.setLabel("Gamble")
					.setStyle(ButtonStyle.Primary)
				let gambaRow = new ActionRowBuilder()
					.addComponents(gambleButton)
				let reply = await interaction.editReply({content: "Your roles were consumed...", components: [gambaRow]})
				let collector = response.createMessageComponentCollector({filter, componentType: ComponentType.Button, time: 60000*10 }); //valid for 10 minutes
				collector.on("collect", async i => {
					collector.stop()
					await guildData.reload()
					await userData.reload()
					let allRanks = await guildData.getRanks({where: {sacrifice: true}})
					if (allRanks.length == 0) {
						i.update({content: "Between the time it took you to send this command and lock in, admins removed all special ranks. How sad!", components: []})
						collector.stop()
						return null
					}
					//Now, roll for specials
					let randomNum = Math.random()
					let totalProbability = allRanks.map((rank) => rank.probability).reduce((a,b) => a+b, 0)/100
					let modifiedProbability = totalProbability
					let goneThrough = 0
					for (let roleId of chosenRoles) {
						let role = (await guildData.getRoles({where: {roleId: roleId}}))[0]
						//console.log(`${roleId}, ${role.roleId}`)
						if (role) {
							let parentRank = (await guildData.getRanks({where: {id: role.RankId}}))[0]
							//console.log("stage 2")
							if (parentRank) {
								//console.log("adjusted...")
								//console.log(parentRank.sacrificeProbabilityAddition/100)
								modifiedProbability += (parentRank.sacrificeProbabilityAddition/100)
							}
						}
					}
					//console.log(modifiedProbability)
					let adjustment = Math.min(modifiedProbability, guildData.sacrificeMaxProbability/100)/totalProbability
					//console.log(`Adjustment: ${adjustment}, total ${totalProbability*adjustment}`)
					for (let rank of allRanks) {
						if (rank.probability == 0) {continue}
						let chanceForRank = (rank.probability/100)*adjustment
						if (randomNum <= chanceForRank+goneThrough && randomNum > goneThrough) {
							//We have rolled this rank!!!
							let roles = await rank.getRoles()
							if (roles.length == 0) {
								await i.update({content: `(${userData.amountGambled}/${guildData.gambleCap}) You would have gotten something, but no roles exist in this rank! go cry to admins. Since you technically won, you keep your roles.`, components: []})
								return null
							}
							let randomRole = roles[randInt(0, roles.length-1)]
							let userRoles = await userData.getRoles()
							for (userRole of userRoles) {
								if (userRole.roleId == randomRole.roleId) {
									await i.update({content: "you lost everything you had...", components: []})
									return null
								}
							}
							let rolesGainArray = []
							for (roleId of chosenRoles) {
								if (randomRole.roleId != roleId) {
									let roleData = (await userData.getRoles({where: {roleId: roleId}}))[0]
									if (roleData) {rolesGainArray.push(roleData)}
								}
							}
							rolesGainArray.push(randomRole)
							userData.addRoles(rolesGainArray)
							await i.update({content: `You won <@&${randomRole.roleId}>! (${rank.name}!) You get to keep your roles!`, components: []})
							return null
						}
						goneThrough += chanceForRank
					}
					
					await i.update({content: "You won... nothing! You lost everything you gave to me, and I'm not giving it back", components: []})
					return null
				})
			} else if (reason == "backedout") {
				interaction.editReply({content: "you're missing out!!!!!", components: []})
			}
		})
    },
}
