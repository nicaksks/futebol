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

    private _schedule: Array<iSchedule> = [];
    private html: string = '';

    public async schedule(): Promise<Array<iSchedule>> {
        await this.getSchedule();
        return this.getGames();
    }

    private async getSchedule(): Promise<void> {
        const response = await fetch('https://ge.globo.com/agenda/#/futebol')
        if (response.status != 200) throw new Error(response.statusText);
        this.html = await response.text();
    }

    private getGames(): Array<iSchedule> {

        const splitHtml = this.html
            .split('<script type="application/ld+json">')

        for (const i in splitHtml) {
            const html = splitHtml[i]
                .split('</script>')[0];

            this.isValidJSON(html);
        }

        return this._schedule
    }

    private isValidJSON(html: string): void {
        try {
            const json = JSON.parse(html);
            this._schedule.push(json);
        } catch (e) { }
    }
}

class Webhook extends Globo {
    
    constructor(
        private readonly URL: string
    ) {
        super()
    }
    
    private async formatText(): Promise<string> {
        const schedule = await this.schedule();
        let text = '';

        for (const game of schedule) {
            for (const sub of game.subEvent) {
                text += `Campeonato: ${game.name} \nTimes: ${sub.name} \nHorário: ${this.epochTime(game.startDate)} \n\n`
            }
        }

        return text;
    }

    private epochTime = (datetime: string): string => `<t:${new Date(datetime).getTime() / 1000}:R>`

    public async send(): Promise<void> {
        const content = await this.formatText()
        fetch(this.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'Globo',
                content
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