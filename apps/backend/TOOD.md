Ahora mismo el sitema de swipes no funciona del todo correctmanete. el orden en elq ue funciona el swipe cuando lo ejecutas es simplemente iniciando el swipe y ya (https://api.flamebot-tin.com/api/tasks/swipe/start). para configurar cual es la cantidad de swipes que vamos a hacer  debemos de configurar con el https://api.flamebot-tin.com/api/edit-tinder-cards.. bdemos asegurarnos de eque esto sea asi correctamente. el edit  lo vamos a dejar siempre como te lo pasare en el ejemplo. que es asi : Request URL
https://api.flamebot-tin.com/api/edit-tinder-cards
Request Method
POST
Status Code
200 OK
Remote Address
[2606:4700:10::6814:29e4]:443
Referrer Policy
strict-origin-when-cross-origin

{
  "edits": [
    {
      "card_id": "6890cbf80fc2ba714d4462b4",
      "update_data": {
        "swiping": {
          "mode": "spectre",
          "swiping_type": "forcematching",
          "like_percentage": 100,
          "sleep_time": 13,
          "swipe_until": "like_quantity",
          "max_likes": 300,
          "force_matching_config": {
            "mode": "like_and_dislike",
            "failure_action": "retry_until_matched"
          }
        }
      }
    }
  ]
}

Lo unico que cambiara sera el max_likes... y el devuvele una respuesta asi en caso de ser exitoso:
{"task_id":"c0ae7a2e-c316-485a-9986-aece516e3fdf","status":"PENDING"}


ahora pasaremos a otra parte. antes de hacer unaacicion del workflow con cual quier cuenta. menos el import (es decir el add bio. add prompt swipe. devemos verificar si esta cuenta esta viva o esta ban. porque si la cuneta no esta alive. haremos acciones para nada comprendido? ya que una cuenta cuando no esta alive se pierde para siempre.... y este es el endpoint para obtener la informacion de la cuennta con el account _id que es el que retorna el import. mira):
curl -X POST "https://api.flamebot-tin.com/api/get-tinder-accounts-by-ids" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCMTYyRjVBMy0wOERELTQ2MEQtODM1QS00MTYwQzYzRjFBMDciLCJleHAiOjE3ODM4MDc5MjB9.7uh_BML451M-z9ApsitJAdWL1aelCiG8h6VKBbaetFo" \
  -d '["687906a3aa9ff444b7a7c09b","687906a3aa9ff444b7a7c09b"]'

  response :
  "success":true,"accounts":[{"user_data":{"id":"687906a3aa9ff444b7a7c09b","general_information":{"name":"Helena","age":22,"phone":"+16814741160","email":"christina.baileyma.ndruma@gmail.com","account_tag":"Helena (22) - Wilmington, Delaware, US","image":"https://images-ssl.gotinder.com/687906a3aa9ff444b7a7c09b/original_58fbe3ed-9663-47ce-84d6-d2cd893c9042.jpeg","location":"Wilmington, Delaware, US","is_verified":false,"school":null,"gender":"woman","sexual_orientation":"bisexual","max_distance":50,"interested_in":"man","age_filter_max":32,"age_filter_min":18,"discoverable":true,"username":null,"job":null,"company":null,"lat_long":{"lat":39.746,"lon":-75.547},"user_entered_lat_long":{"user_entered_lat":39.74594497680664,"user_entered_long":-75.54659271240234},"flag_cc":"US","likes_recieved_count":99,"extra_info":{"Sexual Orientation":"Bisexual","Interests":"Cocktails, Craft Beer, MLB, Dungeons & Dragons, DIY, Harry Potter","Descriptors":"Looking for, Education, Communication Style, Love Style, Pets, Drinking, Smoking, Workout","Prompts":[]},"available_prompts":[{"id":"pro_1","text":"My weird but true story is…"},{"id":"pro_2","text":"The first item on my bucket list is…"},{"id":"pro_3","text":"My parents will like you if…"},{"id":"pro_4","text":"The key to my heart is…"},{"id":"pro_5","text":"My favorite playlist is called…"},{"id":"pro_6","text":"A surprising thing about me is…"},{"id":"pro_7","text":"If I’m not home, you can find me…"},{"id":"pro_8","text":"My biography would probably be called…"},{"id":"pro_9","text":"The hottest thing you can do is…"},{"id":"pro_11","text":"My go-to karaoke song is…"},{"id":"pro_12","text":"My hidden talent is…"},{"id":"pro_14","text":"I can beat you in a game of…"},{"id":"pro_15","text":"My dream job is…"},{"id":"pro_19","text":"People would describe me as…"},{"id":"pro_29","text":"My worst midnight snack habit..."},{"id":"pro_32","text":"Me: I’m a grown up. Also me:"},{"id":"pro_33","text":"If I had 20 minutes left to live, I would..."},{"id":"pro_41","text":"First date wish list:"},{"id":"pro_47","text":"Perks of dating me..."},{"id":"pro_49","text":"I want someone who..."},{"id":"pro_50","text":"Two truths and a lie..."},{"id":"pro_65","text":"Message me if you also love…"},{"id":"pro_79","text":"My weakness is…"},{"id":"pro_100","text":"Life’s too short to…"},{"id":"pro_101","text":"My biggest red flags..."}],"hide_ads":false,"hide_age":false,"hide_distance":false,"create_date":"2025-07-17T14:20:19.347Z"},"class_info":{"class_type":"iris","class_color":"#44ab6c"},"total_statistics":{"total_likes_count":0,"total_dislikes_count":0,"total_matches_count":0},"status":"alive","bio_information":{"bio":null,"is_hidden":false,"automaticbio_settings":{"social_platform_name":null,"my_username":null,"invisible_characters":false,"letter_repetition":false,"random_spaces":false,"random_emojis":false,"random_bio_placement":false,"letter_lookalikes":false,"random_bio_placement_position":"before_handle","bio_language":"english"}},"proxy":{"http":"socks5://ricky_ikonicmgmt_com-country-us-region-kentucky-city-louisville-sid-1441301727029-ttl-24h-filter-high:3h1kpejl8d@gate.nodemaven.com:1080","https":"socks5://ricky_ikonicmgmt_com-country-us-region-kentucky-city-louisville-sid-1441301727029-ttl-24h-filter-high:3h1kpejl8d@gate.nodemaven.com:1080"},"tokens":{"persistent_id":"32caf7c67971468bb78871f693a87601","refresh_id":"eyJhbGciOiJIUzI1NiJ9.MTY4MTQ3NDExNjA.TicRZrhUfkNk0jOBzjCsWQA7gKFzZmaicKjQI5VhAn0","auth_id":"773ec6e8-db3d-4659-9c60-7152b3a819f1"},"swiping":{"mode":"swiping","swiping_type":"forcematching","like_percentage":40,"sleep_time":10,"swipe_until":"max_likes","max_likes":50,"force_matching_config":{"mode":"like_and_dislike","failure_action":"retry_until_matched"}},"notes":"","last_activity":{"$date":"2025-07-17T14:40:19.672Z"},"todays_date":"2025-07-17T15:00:03.359Z","session_statistics":{"session_likes":0,"session_dislikes":0,"session_matches":0,"session_scraped_snapchats":0,"session_scraped_instagrams":0},"booster_info":{"quantity":0,"is_boosting_now":false,"is_boosting_till_timestamp":null,"duration_milliseconds":null,"date":"2025-07-29T18:05:28.810000","currency":""},"purchases":[],"gold":null}}],"total":1}%                                                                                                
~/Work/flamebot/apps/backend selected text
curl -X POST "https://api.flamebot-tin.com/api/get-tinder-accounts-by-ids" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJCMTYyRjVBMy0wOERELTQ2MEQtODM1QS00MTYwQzYzRjFBMDciLCJleHAiOjE3ODM4MDc5MjB9.7uh_BML451M-z9ApsitJAdWL1aelCiG8h6VKBbaetFo" \
  -d '["687906a3aa9ff444b7a7c09b","687906a3aa9ff444b7a7c09b"]'

Quiero obtener el objetct > accounts > user data> status
I'll run that curl command to extract the status from the user data. Based on your selected text, I can see you want to get the status field from accounts[].user_data.status.
Perfect! The status from the user data is "alive".

The curl command successfully retrieved the account information and extracted the status field using jq. For the account ID 687906a3aa9ff444b7a7c09b, the status is "alive".
`


ahora mismo como funciona el swipe no esta correcto. en las flamebotaction service. porfavor entiende lo que me refiero lee el codigo de responabilidad correctamente ants de hacer cambios. encuentra las red flahgs y arerglalas con lo que te pido. muchas gracias"