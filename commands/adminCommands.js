const Validate = require('jsonschema').validate;
const {SlashCommandBuilder, PermissionsBitField, AttachmentBuilder} = require("discord.js");
const guildJSONSchema = {
	type: "object",
	required: ["gambleCap", "gambleDebounce", "ranks"],
	properties: {
		gambleCap: {type: "number", minimum: 1},
		gambleDebounce: {type: "number"},
		ranks: {
			type: "array",
			items: {
				type: "object",
				required: ["name", "probability", "sacrifice", "roles"],
				properties: {
					name: {type: "string"},
					probability: {type: "number", maximum: 100, minimum: 0},
					sacrifice: {type: "boolean"},
					roles: {
						type: "array",
						items: {
							type: "object",
							required: ["name", "color"],
							properties: {
								name: {type: "string"},
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
					.setMaxLength(20)
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
				.setDescription("Get/set the gambling cap")
				.addNumberOption(option =>
					option.setName("value")
					.setDescription("Set the value")
					.setMinValue(0)
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
			)
			.addSubcommand(subcommand =>
				subcommand.setName("remove")
				.setDescription("Remove a rank from the gambling database")
				.addStringOption(option =>
					option.setName("rank")
					.setDescription("Name of the rank")
					.setRequired(true)
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
			console.log("No guild data found! creating guild data...")
			guildData = await Database.models.Guild.create({guildId: interaction.guildId})
		}
        switch (interaction.options.getSubcommandGroup()) {
            case "role":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRole = interaction.options.getRole("role")
                        var requestedRank = interaction.options.getString("rank")
						console.log(requestedRole.id)
						if (requestedRole.id == interaction.guildId) {
							interaction.reply({content: "You cannot use the role @everyone.", ephemeral: true})
							break
						}
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (!rank) {
                            interaction.reply({content: `The rank ${requestedRank} doesn't exist! Try something else.`, ephemeral: true})
                            break
                        }
						try {
							role = await Database.models.Role.create({roleId: requestedRole.id})
							rank.addRoles(role)
							guildData.addRoles(role)
							interaction.reply({content: `Successfully registered <@&${requestedRole.id}> to ${requestedRank}.\nMake sure <@&${requestedRole.id}> is beneath this bot's highest role.`, ephemeral: true})
						} catch (err) {
							interaction.reply({content: `<@&${requestedRole.id}> is already registered with a rank!`, ephemeral: true})
						}
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
                }
                break
            case "rank":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRank = interaction.options.getString("rank")
                        var probability = interaction.options.getNumber("probability")
						var sacrifice = (interaction.options.getBoolean("sacrifice") != null) ? interaction.options.getBoolean("sacrifice") : false
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (rank) {
                            interaction.reply({content: `The rank ${requestedRank} already exists! try a different name.`, ephemeral: true})
                            break
                        }
						rank = await Database.models.Rank.create({name: requestedRank, probability: probability, sacrifice: sacrifice})
						await guildData.addRanks(rank)
						var totalProbability = (await guildData.getRanks()).map(function(rank) {return rank.probability}).reduce(function(a,b) {return a+b}, 0)
                        interaction.reply({content: `Successfully created ${requestedRank} with a chance of ${probability}% to appear. The total probability is now ${totalProbability}%.`, ephemeral: true})
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
						break
					case "gamblingdebounce":
						if (value == null) {
							interaction.reply({content: `Gambling debounce: ${guildData.gambleDebounce}`, ephemeral: true})
						} else {
							guildData.gambleDebounce = value
							await guildData.save()
							interaction.reply({content: `Gambling debounce is now ${guildData.gambleDebounce}`, ephemeral: true})
						}
						break
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
						await guildData.save()
						var exceptions = ""
						let ranksToAdd = []
						for (let rankData of json.ranks) {
							var rank = (await guildData.getRanks({where: {name: rankData.name}}))[0]
							if (rank) {
								exceptions += `Rank ${rankData.name} already exists.\n`
							} else {
								rank = await Database.models.Rank.create({name: rankData.name, probability: rankData.probability, sacrifice: rankData.sacrifice})
								ranksToAdd.push(rank)
							}
							let rolesToAdd = []
							for (let roleData of rankData.roles) {
								let role = await interaction.guild.roles.create({name: roleData.name, color: roleData.color, reason: "Imported JSON"})
								let roleForDatabase = await Database.models.Role.create({roleId: role.id})
								rolesToAdd.push(roleForDatabase)
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
							ranks: []
						}
						for (let rank of await guildData.getRanks()) {
							var rankParsed = {
								name: rank.name,
								probability: rank.probability,
								sacrifice: rank.sacrifice,
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
