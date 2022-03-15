"use strict";
const { promises: { readFile} } = require("fs");

class Handler {
    constructor({rekoSvc, translatorSvc}) {
        this.rekoSvc = rekoSvc
        this.translatorSvc = translatorSvc
    }

    async detectImageLabels(buffer) {
        const result = await this.rekoSvc.detectLabels({
            Image: {
                Bytes: buffer
            }
        }).promise()
        const workingItems = result.Labels.filter(({Confidence}) => Confidence > 80)
        const names = workingItems.map(({Name}) => Name).join(' and ')
        // console.log(workingItems)
        return {names, workingItems}
    }

    async translateText(text) {
        const params = {
            SourceLanguageCode: 'en',
            TargetLanguageCode: 'pt',
            Text: text
        }
        const {TranslatedText} = await this.translatorSvc.translateText(params).promise()
        console.log(JSON.stringify(TranslatedText))
        return TranslatedText.split(' e ')
    }

    async formatTextResults(texts, workingItems) {
        const finalText = []
        for (const indexText in texts) {
            const nameInPortuguese = texts[indexText]
            const confidence = workingItems[indexText].Confidence
            finalText.push(` ${confidence.toFixed(2)}% de ser do tipo ${nameInPortuguese}`)
        }
        return finalText.join('\n')
    }

    async main(event) {
        try {
            const imgBuffer = await readFile('./images/puttinha.jpg')
            console.log('Detecting Labels...')
            const {names, workingItems} = await this.detectImageLabels(imgBuffer)
            console.log('Translating to Portuguese...')
            const texts = await this.translateText(names)
            console.log('Handling final object...')
            const finalText = await this.formatTextResults(texts, workingItems)
            console.log('Finishing...')

            return {
                statusCode: 200,
                body: `A imagem tem\n `.concat(finalText)
            }
        }catch (e) {
            console.log('ERROR***', e.stack)
            return {
                statusCode: 500,
                body: 'Internal Server ERROR!!!'
            }
        }
    }
}


const aws = require('aws-sdk')
const reko = new aws.Rekognition
const translator = new aws.Translate()

const handler = new Handler({
    rekoSvc: reko,
    translatorSvc: translator
})


module.exports.main = handler.main.bind(handler)
