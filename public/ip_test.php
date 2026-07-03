<?php
$data = file_get_contents('../scratch/ip_list.json');
$utf8 = mb_convert_encoding($data, 'UTF-8', 'UTF-16LE');
echo $utf8;
