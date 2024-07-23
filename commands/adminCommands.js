const Validate = require('jsonschema').validate;
const {SlashCommandBuilder, PermissionsBitField, AttachmentBuilder} = require("discord.js");
const delay = ms => new Promise(res => setTimeout(res, ms));
const guildJSONSchema = {
	type: "object",
	required: ["gambleCap", "gambleDebounce", "ranks", "sacrificeMaxProbability"],
	properties: {
		gambleCap: {type: "number", minimum: 1},
		gambleDebounce: {type: "number"},
		sacrificeMaxProbability: {type: "number", minimum: 0, maximum: 100},
		ranks: {
			type: "array",
			items: {
				type: "object",
				required: ["name", "probability", "sacrifice", "roles", "sacrificeProbabilityAddition"],
				properties: {
					name: {type: "string", minLength: 1, maxLength: 100},
					probability: {type: "number", maximum: 100, minimum: 0},
					sacrifice: {type: "boolean"},
					sacrificeProbabilityAddition: {type: "number", minimum: 0, maximum: 100},
					roles: {
						type: "array",
						items: {
							type: "object",
							required: ["name", "color"],
							properties: {
								name: {type: "string", minLength: 1, maxLength: 100},
								color: {type: "string", pattern: "^#?[0-9a-fA-F]{6}$"}
							}
						}
					}
				}
			}
		}
	}
}

module.exports = {
    data: new SlashCommandBuilder()
    	.setName("admin")
    	.setDescription("All Admin commands")
		.addSubcommandGroup(subcommandGroup =>
			subcommandGroup.setName("role")
			.setDescription("Manage roles in gambling database")
			.addSubcommand(subcommand =>
				subcommand.setName("add")
				.setDescription("Add role to gambling database")
				.addRoleOption(option =>
					option.setName("role")
					.setDescription("The role to add to database")
					.setRequired(true)
				)
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Rank of the role")
					.setMaxLength(100)
					.setMinLength(1)
					.setRequired(true)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("remove")
				.setDescription("Removes a role from the gambling database")
				.addRoleOption(option =>
					option.setName("role")
					.setDescription("Role to remove")
					.setRequired(true)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("gift")
				.setDescription("Gift a role to your favourite person")
				.addRoleOption(option =>
					option.setName("role")
					.setDescription("The role to gift to user. must be in database")
					.setRequired(true)
				)
				.addUserOption(option =>
					option.setName("user")
					.setDescription("The user to gift it to.")
					.setRequired(true)
				)
			)
		)
		.addSubcommandGroup(subCommandGroup =>
			subCommandGroup.setName("settings")
			.setDescription("Manage settings in gambling database")
			.addSubcommand(subcommand =>
				subcommand.setName("gamblingcap")
				.setDescription("Get/set the gambling cap")
				.addNumberOption(option =>
					option.setName("value")
					.setDescription("Set the value")
					.setMinValue(1)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("gambledebounce")
				.setDescription("Get/set the gambling debounce, measured in milliseconds. Default is 86400000")
				.addNumberOption(option =>
					option.setName("value")
					.setDescription("Set the value")
					.setMinValue(0)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("sacrificemaxprobability")
				.setDescription("Get/set the maximum sacrifice probability")
				.addNumberOption(option =>
					option.setName("value")
					.setDescription("Set the value")
					.setMinValue(0)
					.setMaxValue(100)
				)
			)
		)
		.addSubcommandGroup(subCommandGroup =>
			subCommandGroup.setName("rank")
			.setDescription("Manage ranks in gambling database")
			.addSubcommand(subcommand =>
				subcommand.setName("add")
				.setDescription("Add a rank to the gambling database")
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Name of the rank")
					.setMinLength(1)
					.setMaxLength(100)
					.setRequired(true)
				)
				.addNumberOption(option =>
					option.setName("probability")
					.setDescription("Probability of getting a role from this rank when gambling (0%-100%)")
					.setMinValue(0)
					.setRequired(true)
					.setMaxValue(100)
				)
				.addBooleanOption(option =>
					option.setName("sacrifice")
					.setDescription("Whether this rank is special, and can only be obtained through sacrifice. Default is false")
				)
				.addNumberOption(option =>
					option.setName("sacrificeprobabilityaddition")
					.setDescription("How much this rank adds per role sacrificed. Default is +1% for each role sacrificed")
					.setMinValue(0)
					.setMaxValue(100)
				)
			)
			.addSubcommand(subcommand =>
				subcommand.setName("remove")
				.setDescription("Remove a rank from the gambling database")
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Name of target rank")
					.setRequired(true)
				)
			)
			.addSubcommand(subcommand => 
				subcommand.setName("modify")
				.setDescription("Modify a rank in the gambling database")
				.addStringOption(option => 
					option.setName("rank")
					.setDescription("Name of target rank")
					.setRequired(true)
				)
				.addStringOption(option => 
					option.setName("newname")
					.setDescription("New name of the target rank")
					.setMaxLength(100)
				)
				.addNumberOption(option => 
					option.setName("probability")
					.setDescription("New probability of target rank")
					.setMinValue(0)
					.setMaxValue(100)
				)
				.addBooleanOption(option => 
					option.setName("sacrifice")
					.setDescription("New sacrifice property of target rank.")
				)
				.addNumberOption(option => 
					option.setName("sacrificeprobabilityaddition")
					.setDescription("New sacrifice probability addition of target rank")
					.setMinValue(0)
					.setMaxValue(100)
				)
			)
		)
		.addSubcommandGroup(subCommandGroup =>
			subCommandGroup.setName("json")
			.setDescription("Managing the gamble bot using JSON")
			.addSubcommand(subcommand => 
				subcommand.setName("import")
				.setDescription("import JSON server data")
				.addAttachmentOption(option => 
					option.setName("json")
					.setDescription("JSON file")
					.setRequired(true)
				)
				.addBooleanOption(option =>
					option.setName("removeroles")
					.setDescription("Clears all roles from the guild.")
				)
				.addBooleanOption(option =>
					option.setName("cleardata")
					.setDescription("Clears ALL data from the database. Default: True")
				)
			)
			.addSubcommand(subcommand => 
				subcommand.setName("export")
				.setDescription("Export server data into JSON, or generates a template if empty")
			)
			
		),
    async execute(interaction, Database) {
		if (!interaction.inGuild()) {
			interaction.reply({content: "Please run this in a guild!", ephemeral: true})
			return null
		}
		let guildData = await Database.models.Guild.findOne({where: {guildId: interaction.guildId}})
		if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
			interaction.reply({content: "Only admins can use this command!", ephemeral: true})
			return null
		}
		if (!guildData) {
			//console.log("No guild data found! creating guild data...")
			guildData = await Database.models.Guild.create({guildId: interaction.guildId})
		}
        switch (interaction.options.getSubcommandGroup()) {
            case "role":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRole = interaction.options.getRole("role")
                        var requestedRank = interaction.options.getString("rank")
						if (requestedRole.id == interaction.guildId) {
							interaction.reply({content: "You cannot use the role @everyone.", ephemeral: true})
							break
						}
						if (requestedRole.managed == true) {
							interaction.reply({content: `<@&${requestedRole.id}> is managed externally, and cannot be controlled by this bot.`, ephemeral: true})
							break
						}
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (!rank) {
                            interaction.reply({content: `The rank ${requestedRank} doesn't exist! Try something else.`, ephemeral: true})
                            break
                        }
						if ((await guildData.getRoles({where: {roleId: requestedRole.id}})).length != 0) {
							interaction.reply({content: `<@&${requestedRole.id}> is already registered with a rank!`, ephemeral: true})
						}
						role = await Database.models.Role.create({roleId: requestedRole.id})
						rank.addRoles(role)
						guildData.addRoles(role)
						interaction.reply({content: `Successfully registered <@&${requestedRole.id}> to ${requestedRank}.\nMake sure <@&${requestedRole.id}> is beneath this bot's highest role.`, ephemeral: true})
                        break
                    case "remove":
						var requestedRole = interaction.options.getRole("role")
                        var requestedRank = interaction.options.getString("rank")
						if (requestedRole.id == interaction.guildId) {
							interaction.reply({content: "@everyone guaranteed is not registered.", ephemeral: true})
							break
						}
                        var role = (await guildData.getRoles({where: {roleId: requestedRole.id}}))[0]
						if (!role) {
							interaction.reply({content: `<@&${requestedRole.id}> is not registered.`, ephemeral: true})
							break
						}
						await role.destroy()
						interaction.reply({content: `Unregistered <@&${requestedRole.id}> from ${rank.name}`, ephemeral: true})
                        break
					case "gift":
						var requestedRole = interaction.options.getRole("role")
						var requestedUser = interaction.options.getUser("user")
						var userData = (await guildData.getUsers({where: {userId: requestedUser.id}}))[0]
						if (!userData) {
							userData = await Database.models.User.create({userId: requestedUser.id})
							guildData.addUsers(userData)
						}
						var role = (await guildData.getRoles({where: {roleId: requestedRole.id}}))[0]
						if (!role) {
							interaction.reply({content: `<@&${requestedRole.id}> doesn't exist in the database.`, ephemeral: true})
							break
						}
						if ((await userData.getRoles({where: {roleId: requestedRole.id}})).length > 0) {
							interaction.reply({content: `<@${requestedUser.id}> already has <@&${requestedRole.id}>!`, ephemeral: true})
							break
						}
						userData.addRoles(role)
						interaction.reply({content: `Gifted <@${requestedUser.id}> <@&${requestedRole.id}>!`, ephemeral: true})
						break
                }
                break
            case "rank":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRank = interaction.options.getString("rank")
                        var probability = interaction.options.getNumber("probability")
						var sacrifice = (interaction.options.getBoolean("sacrifice") != null) ? interaction.options.getBoolean("sacrifice") : false
						var sacrificeAddition = (interaction.options.getBoolean("sacrificeprobabilityaddition") != null) ? interaction.options.getBoolean("sacrificeprobabilityaddition") : 1
						
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (rank) {
                            interaction.reply({content: `The rank ${requestedRank} already exists! try a different name.`, ephemeral: true})
                            break
                        }
						rank = await Database.models.Rank.create({name: requestedRank, probability: probability, sacrifice: sacrifice, sacrificeProbabilityAddition: sacrificeAddition})
						await guildData.addRanks(rank)
						var totalProbability = (await guildData.getRanks()).map(function(rank) {return rank.probability}).reduce(function(a,b) {return a+b}, 0)
                        interaction.reply({content: `Successfully created ${requestedRank} with a chance of ${probability}% to appear. The total probability is now ${totalProbability}%.`, ephemeral: true})
                        break
					case "modify":
						var requestedRank = interaction.options.getString("rank")
                        var probability = interaction.options.getNumber("probability")
						var newRankName = interaction.options.getString("newname")
                        var sacrifice = interaction.options.getBoolean("sacrifice")
						var sacrificeProbabilityAddition = interaction.options.getNumber("sacrificeprobabilityaddition")
						var content = `Changes to ${requestedRank}:`
						var unchangedContent = content
						var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (!rank) {
                            interaction.reply({content: `The rank ${requestedRank} doesn't exist. Try a different name.`, ephemeral: true})
                            break
                        }
						if (probability) {
							rank.probability = probability
							content += `\nChanged probability to ${rank.probability}%`
						}
						if (sacrifice != null) {
							rank.sacrifice = sacrifice
							content += `\nChanged sacrifice state to ${rank.sacrifice}`
						}
						if (newRankName) {
							rank.name = newRankName
							content += `\nChanged rank name to ${rank.name}`
						}
						if (sacrificeProbabilityAddition) {
							rank.sacrificeProbabilityAddition = sacrificeProbabilityAddition
							content += `\nChanged rank sacrifice probability addition to ${rank.sacrificeProbabilityAddition}`
						}
						await rank.save()
						if (content == unchangedContent) {
							content += " (No changes made)"
							content += `\nProbability is currently ${rank.probability}%`
							content += `\nSacrifice state is currently ${rank.sacrifice}`
							content += `\nSacrifice probability addition is currently ${rank.sacrificeProbabilityAddition}`
						}
						interaction.reply({content: content, ephemeral: true})
						break
                    case "remove":
						var requestedRank = interaction.options.getString("rank")
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (rank) {
							await guildData.removeRanks(rank)
							await rank.destroy()
							var totalProbability = (await guildData.getRanks()).map(function(rank) {return rank.probability}).reduce(function(a,b) {return a+b}, 0)
                            interaction.reply({content: `Successfully removed ${requestedRank}. The total probability is ${totalProbability}%`, ephemeral: true})
                            break
                        } else {
							interaction.reply({content: `${requestedRank} does not exist.`, ephemeral: true})
							break
						}
                }
				break
			case "settings":
				var value = interaction.options.getNumber("value")
				switch (interaction.options.getSubcommand()) {
					case "gamblingcap":
						if (value == null) {
							interaction.reply({content: `Gambling cap: ${guildData.gambleCap}`, ephemeral: true})
						} else {
							guildData.gambleCap = value
							await guildData.save()
							interaction.reply({content: `Gambling cap is now ${guildData.gambleCap}`, ephemeral: true})
						}
						break;
					case "gambledebounce":
						if (value == null) {
							interaction.reply({content: `Gambling debounce: ${guildData.gambleDebounce}`, ephemeral: true})
						} else {
							guildData.gambleDebounce = value
							await guildData.save()
							interaction.reply({content: `Gambling debounce is now ${guildData.gambleDebounce}`, ephemeral: true})
						}
						break;
					case "sacrificemaxprobability":
						if (value == null) {
							interaction.reply({content: `Sacrifice maximum probability: ${guildData.sacrificeMaxProbability}%`, ephemeral: true})
						} else {
							guildData.sacrificeMaxProbability = value
							await guildData.save()
							interaction.reply({content: `The max sacrifice probability is now ${guildData.sacrificeMaxProbability}%`, ephemeral: true})
						}
						break;
				}
				break
			case "json":
				switch (interaction.options.getSubcommand()) {
					case "import":
						if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
							interaction.reply({content: "This bot has no permissions to manage roles.... what are the admins doing??", ephemeral: true})
							break
						}
						var removeRoles = interaction.options.getBoolean("removeroles")
						var clearData = (interaction.options.getBoolean("cleardata") != null) ? interaction.options.getBoolean("removeroles") : true
						if (removeRoles) {
							for (let role of await guildData.getRoles()) {
								let guildRole = await interaction.guild.roles.fetch(role.roleId, 1)
								if (guildRole && interaction.guild.members.me.roles.highest.comparePositionTo(guildRole) > 0) {
									guildRole.delete("JSON import")
								}
								await delay(3000)
							}
						}
						if (clearData) {
							await guildData.destroy()
							guildData = await Database.models.Guild.create({guildId: interaction.guildId})
						}
						await interaction.deferReply({ephemeral: true})
						var jsonURL = interaction.options.getAttachment("json").attachment
						var file = await (await fetch(jsonURL)).blob()
						if (file.type.slice(0,16) != "application/json") {interaction.editReply("The file is not a JSON file...."); break}
						var json = JSON.parse(await file.text())
						var validation = Validate(json, guildJSONSchema)
						if (!validation.valid) {
							let errorString = ""
							for (error of validation.errors) {
								errorString += error.toString()+"\n"
							}
							interaction.editReply(`Your JSON file has invalid parameters!:\n\`\`\`${errorString}\`\`\``)
							break
						}
						guildData.gambleCap = json.gambleCap
						guildData.gambleDebounce = json.gambleDebounce
						guildData.sacrificeMaxProbability = json.sacrificeMaxProbability
						await guildData.save()
						var exceptions = ""
						let ranksToAdd = []
						for (let rankData of json.ranks) {
							var rank = (await guildData.getRanks({where: {name: rankData.name}}))[0]
							if (rank) {
								exceptions += `Rank ${rankData.name} already exists.\n`
							} else {
								rank = await Database.models.Rank.create({name: rankData.name, probability: rankData.probability, sacrifice: rankData.sacrifice, sacrificeProbabilityAddition: rankData.sacrificeProbabilityAddition})
								ranksToAdd.push(rank)
							}
							let rolesToAdd = []
							for (let roleData of rankData.roles) {
								let role = await interaction.guild.roles.create({name: roleData.name, color: roleData.color, reason: "Imported JSON"})
								let roleForDatabase = await Database.models.Role.create({roleId: role.id})
								rolesToAdd.push(roleForDatabase)
								await delay(3000)
							}
							await rank.addRoles(rolesToAdd)
							await guildData.addRoles(rolesToAdd)
						}
						await guildData.addRanks(ranksToAdd)
						await guildData.reload()
						var response = "Successfully changed the server settings"
						if (exceptions != "") {
							response += ", with exceptions:\n"+exceptions
						}
						interaction.editReply(response)
						break
					case "export":
						var guildParsed = {
							gambleCap: guildData.gambleCap,
							gambleDebounce: guildData.gambleDebounce,
							sacrificeMaxProbability: guildData.sacrificeMaxProbability,
							ranks: []
						}
						for (let rank of await guildData.getRanks()) {
							var rankParsed = {
								name: rank.name,
								probability: rank.probability,
								sacrifice: rank.sacrifice,
								sacrificeProbabilityAddition: rank.sacrificeProbabilityAddition,
								roles: []
							}
							for (let role of await rank.getRoles()) {
								try {
									var roleInGuild = await interaction.guild.roles.fetch(role.roleId, 1)
									var roleParsed = {
										name: roleInGuild.name,
										color: roleInGuild.hexColor
									}
									rankParsed.roles.push(roleParsed)
								} catch (err) {
									console.log("some role dont exist probably")
								}
							}
							guildParsed.ranks.push(rankParsed)
						}
						var guildJSON = JSON.stringify(guildParsed, null, 4)
						var jsonFile = new AttachmentBuilder()
							.setName("gambling_roles.json")
							.setFile(Buffer.from(guildJSON, 'utf8'))
						interaction.reply({content: "Here you go", files: [jsonFile]})

				}
				break
  		}
    }
}
