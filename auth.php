<?php
$s = escapeshellcmd('python /var/www/spotirec.me/cgi-bin/auth.py ' . escapeshellarg($_GET['code'])) . ' 2>&1';
echo $s;
$output = shell_exec($s);
echo $output;
?>
