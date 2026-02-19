$otp = rand(100000,999999);
$to = $email;
$subject = "Verification Code";
$message = "Your OTP code is: " . $otp;
$headers = "From: noreply@yoursite.com";
mail($to, $subject, $message, $headers);