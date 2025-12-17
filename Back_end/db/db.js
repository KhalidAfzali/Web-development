import mongodb from "mongoose"

const connectionToDatabase = async () => {
    try{
        await mongodb.connect(process.env.MONGODB_URL)
    } catch (error){
        console.log(error)
    }
}

export default connectionToDatabase;