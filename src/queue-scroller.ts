import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js"

@customElement("queue-scroller")
export class QueueScroller extends LitElement {
    // @property({ type: Array }) zzz = [{ "lastQueue": { "name": "Outdial Queue-1" }, "aggregation": [{ "name": "oldestStart", "value": "1751571571033" }, { "name": "TaskCount", "value": 1 }] }, { "lastQueue": { "name": "Queue-1" }, "aggregation": [{ "name": "oldestStart", "value": "1751914494621" }, { "name": "TaskCount", "value": 2 }] }]
    @property({ type: Array }) these = []//this.zzz.map((item) => html`<li oldestCall=${item.aggregation[0].value}> | Queue: ${item.lastQueue.name} Calls: ${item.aggregation[1].value} Wait: ${new Date(Date.now() - item.aggregation[0].value).toISOString().slice(11, -5)} |</li>`)
    @property({ type: Array }) queueArray = []
    @property() teamId?: string 
    @property() token?: string
    @property({ type: Array }) queueFilter = []
    @property() orgId?: string
    @state() _timerInterval?: any
    static styles = [
        css`
            :host {
                display: flex;
                }
            .marquee-container {
            width: 30vw;
            height: 50px; /* Set a fixed height for the container */
            overflow: hidden; 
            border:solid;
            border-radius:25px;
            }

            .marquee {
            list-style: none; /* Remove default list styles */
            display:flex;
            padding: 0;
            margin: 0;
            height:100%;
            width:max-content;
            animation: scroll 10s linear infinite; 
            align-items:center;
            }
            .marquee li {
            display:flex;
            align-self:center;
            align-items:center;
            justify-content:center;
            flex-shrink:0;
            font-size:2rem;
            white-space:nowrap;
            padding: 0 1rem 0 1rem;
            }
            .marquee:hover{
            animation-play-state: paused;
  
            }

            @keyframes scroll {
            0% {
                transform: translateX(0); /* Start position */
            }
            100% {
                transform: translateX(-50%); /* End position (fully scrolled) */
            }
            }
        `
    ];


    connectedCallback(): void {
        super.connectedCallback()
        this.getQueues()
        this._timerInterval = setInterval(() => this.getStats(), 10000);
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        clearInterval(this._timerInterval);
    }

    async getStats() {
        const myHeaders = new Headers();
        myHeaders.append("Accept-Encoding", "gzip, deflate, br");
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Accept", "application/json");
        myHeaders.append("Authorization", `Bearer ${this.token}`);

        const queues = {
            or: this.queueFilter
        }

        const raw = JSON.stringify({
            "query": "query myQueueStats($from:Long! $to:Long! $timeComparator:QueryTimeType $filter:TaskFilters $aggregations:[TaskV2Aggregation]){task(from:$from to:$to timeComparator:$timeComparator filter:$filter aggregations:$aggregations){tasks{lastQueue{name}aggregation{name value}}}}",
            "variables": {
                "from": `${Date.now() - 86400000}`,
                "to": `${Date.now()}`,
                "timeComparator": "createdTime",
                "filter": {
                    "and": [
                        {
                            "isActive": {
                                "equals": true
                            }
                        },
                        queues
                    ]
                },
                "aggregations": [
                    {
                        "field": "id",
                        "type": "count",
                        "name": "TaskCount"
                    },
                    {
                        "field": "createdTime",
                        "type": "min",
                        "name": "oldestStart"
                    }
                ]
            }
        });

        const requestOptions: Object = {
            method: "POST",
            headers: myHeaders,
            body: raw,
            redirect: "follow"
        };

        try {
            const response = await fetch("https://api.wxcc-us1.cisco.com/search", requestOptions);
            const result = await response.json();
            const data = await result.data.task.tasks
            // this.zzz = data
            this.these = data.map((item: any) => html`<li oldestCall=${item.aggregation[0].value}> | Queue: ${item.lastQueue.name} Calls: ${item.aggregation[1].value} Wait: ${new Date(Date.now() - item.aggregation[0].value).toISOString().slice(11, -5)} |</li>`)
            console.log(result)
        } catch (error) {
            console.error(error);
        };
    }
    async getQueues() {
        const myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${this.token}`);

        const requestOptions: object = {
            method: "GET",
            headers: myHeaders,
            redirect: "follow"
        };

        try {
            const response = await fetch(`https://api.wxcc-us1.cisco.com/organization/${this.orgId}/team/${this.teamId}/incoming-references`, requestOptions);
            const result = await response.json();
            const data = await result.data
            this.queueArray = await result.data
            this.queueFilter = await data.map((queue: any) => { return { lastQueue: { name: { equals: queue.name } } } })
            console.log(this.queueFilter)
            this.getStats()
            console.log(result)
        } catch (error) {
            console.error(error);
        };
    }

    render() {
        return html`
        <div class="marquee-container">
            <ul class="marquee">
                ${this.these}
                 ${this.these}
                <!-- ${this.these} -->
            </ul>
        </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "queue-scroller": QueueScroller;
    }
}
