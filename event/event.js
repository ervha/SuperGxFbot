module.exports = {
    name:"event",
    description: 'メイン',
    async execute(client,event,args,message){
        if (event == "delete"){
            client.commands.get('delete-').execute(client,event,args,message)
        }
        if (event == "test"){
            client.commands.get('test').execute(client,event,args,message)
        }
    }
}