module.exports = {
    name:"event",
    description: 'メイン',
    async execute(client,event,args,message){
        if (event == "react"){
            client.commands.get('react').execute(client,event,args,message)
        }
        if (event == "delete"){
            client.commands.get('delete-react').execute(client,event,args,message)
        }
        if (event == "test"){
            client.commands.get('test').execute(client,event,args,message)
        }
    }
}