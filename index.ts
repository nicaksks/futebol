import { CronJob } from 'cron';

interface iGlobo {
    "@contenxt": string;
    "@type": string;
    name: string;
    startDate: string;
    location: iLocation;
}

interface iSchedule extends iGlobo {
    subEvent: Array<iSubEvent>
}

interface iSubEvent extends iGlobo {
    location: iLocation;
    homeTeam: iTeam;
    awayTeam: iTeam
}

interface iLocation {
    "@type": string;
    name: string;
    address: iAddress
}

interface iTeam {
    "@type": string;
    name: string;
    memberOf: iMember;
    sport: string;
}

interface iMember {
    "@type": string;
    name: string
}

interface iAddress {
    "@type": string;
    addressRegion: string
}

class Globo {

    public schedule: Array<iSchedule>
    private html: string;

    constructor() {
        this.schedule = []
        this.html = '';
    }

    public async start(): Promise<void> {
        await this.getSchedule();
        this.getGames();
    }

    private async getSchedule(): Promise<void> {
        const response = await fetch('https://ge.globo.com/agenda/#/futebol')
        if (response.status != 200) throw new Error(response.statusText);
        this.html = await response.text();
    }

    private getGames(): void {

        const splitHtml = this.html
            .split('<script type="application/ld+json">')

        for (const i in splitHtml) {
            const html = splitHtml[i]
                .split('</script>')[0];

            this.isValidJSON(html);
        }
    }

    private isValidJSON(html: string): void {
        try {
            const json = JSON.parse(html);
            this.schedule.push(json);
        } catch (e) { }
    }
}

class Webhook extends Globo {

    private text: string;

    constructor(
        private readonly URL: string
    ) {
        super()
        this.text = '';
    }

    private async formatText(): Promise<void> {
        await this.start();
        for (const game of this.schedule) {
            for (const sub of game.subEvent) {
                this.text += `Campeonato: ${game.name} \nTimes: ${sub.name} \nHorário: ${this.epochTime(game.startDate)} \n\n`
            }
        }
    }

    private epochTime = (datetime: string): string => `<t:${new Date(datetime).getTime() / 1000}:R>`

    public async send(): Promise<void> {
        await this.formatText()
        fetch(this.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'Globo',
                content: this.text
            })
        })
            .catch(e => console.error(`Ocorreu um erro -> ${e}`))
    }
}

new CronJob('0 1 0 * * *',
    async function () {
        const web = new Webhook(process.env.URL ?? '')
        await web.send()
    },
    'America/Sao_Paulo'
)
    .start()