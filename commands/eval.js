const {SlashCommandBuilder} = require("discord.js")
const util = require("util")
const OWNERS = [219486752484622336]
module.exports = {
    data: new SlashCommandBuilder()
        .setName("eval")
        .setDescription("evaluate code")
        .addStringOption(option =>
            option.setName("code")
                .setDescription("code")
                .setRequired(true)
        ),
    async execute(interaction, Database) {
        //await interaction.deferReply({ephemeral: true})
        var owner = OWNERS.find(ownerId => ownerId == interaction.user.id)
        await interaction.deferReply()
        if (owner) {
            try {
                const response = eval(interaction.options.getString("code"))
                interaction.editReply("```js\n" + util.inspect(response, {depth: 1}) + " ```")
            } catch (err) {
                interaction.editReply("```" + err + "```")
            }
        } else {
            interaction.editReply({content: "No permissions", ephemeral: true})
        }
    }
}