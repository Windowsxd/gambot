const {SlashCommandBuilder, PermissionsBitField} = require("discord.js");

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
                        var ranks = await guildData.getRanks()
						let deleted = false
						for (rank of ranks) {
							let role = (await rank.getRoles({where: {roleId: requestedRole.id}}))[0]
							if (role) {
								await role.destroy()
								deleted = true
								interaction.reply({content: `Unregistered <@&${requestedRole.id}> from ${rank.name}`, ephemeral: true})
								break
							}
						}
						if (!deleted) {
							interaction.reply({content: `<@&${requestedRole.id}> is not registered.`, ephemeral: true})
						}
                        break
                }
                break
            case "rank":
                switch (interaction.options.getSubcommand()) {
                    case "add":
                        var requestedRank = interaction.options.getString("rank")
                        var probability = interaction.options.getNumber("probability")
                        var rank = (await guildData.getRanks({where: {name: requestedRank}}))[0]
                        if (rank) {
                            interaction.reply({content: `The rank ${requestedRank} already exists! try a different name.`, ephemeral: true})
                            break
                        }
						rank = await Database.models.Rank.create({name: requestedRank, probability: probability})
						guildData.addRanks(rank)
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
  		}
    }
}
