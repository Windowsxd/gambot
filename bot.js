import { Database } from "bun:sqlite";

const Discord = require("discord.js")
const path = require("bun:path")
const fs = require("fs")
const dbPath = "data.sqlite"
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

try {
    let db = new Database(dbPath);
    try {
        db.query(`CREATE TABLE Guilds (guildId, roles, dailyGambleCap, ranks);`).run()
    } catch (err) {console.log("Guilds table already exists")}
    db.close(false)
    //database.query(`INSERT INTO Guild${interaction.guildId} (roles, dailyGambleCap, ranks) VALUES ('', 10, '')`).run()
} catch (err) {
    console.log("An error occured!")
    console.log(err)
}

const client = new Discord.Client({ intents: [
	Discord.GatewayIntentBits.Guilds,
	Discord.GatewayIntentBits.GuildMessages,
	Discord.GatewayIntentBits.DirectMessages,
	Discord.GatewayIntentBits.DirectMessageReactions,
	Discord.GatewayIntentBits.GuildMessageReactions
]});

client.commands = new Discord.Collection()

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ("data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("interactionCreate", async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	let db = new Database(dbPath);
	try {
		await command.execute(interaction, db);
		db.close(false)
	} catch (error) {
		db.close()
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
		} else {
			await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
		}
	}
  });
client.login(process.env.TOKEN);
